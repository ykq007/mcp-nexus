import type { PrismaClient, TavilyKey } from '@mcp-nexus/db';
import { orderKeyCandidates, type TavilyKeySelectionStrategy } from '@mcp-nexus/core';
import { decryptAes256Gcm } from '../crypto/crypto.js';
import { fetchTavilyCredits, releaseCreditsRefreshLock, tryAcquireCreditsRefreshLock } from './credits.js';
import { calculateOperationCost, isExpensiveOperation, type OperationType, type OperationParams } from './creditCosts.js';

const CREDITS_TTL_MS = Number(process.env.TAVILY_CREDITS_CACHE_TTL_MS ?? String(60_000));
const CREDITS_STALE_GRACE_MS = Number(process.env.TAVILY_CREDITS_STALE_GRACE_MS ?? String(5 * 60_000));
const CREDITS_MIN_REMAINING = Number(process.env.TAVILY_CREDITS_MIN_REMAINING ?? '1');
const CREDITS_COOLDOWN_MS = Number(process.env.TAVILY_CREDITS_COOLDOWN_MS ?? String(5 * 60_000));
const CREDITS_REFRESH_LOCK_MS = Number(process.env.TAVILY_CREDITS_REFRESH_LOCK_MS ?? String(15_000));
const CREDITS_REFRESH_TIMEOUT_MS = Number(process.env.TAVILY_CREDITS_REFRESH_TIMEOUT_MS ?? String(5_000));
const CREDITS_REFRESH_MAX_RETRIES = Number(process.env.TAVILY_CREDITS_REFRESH_MAX_RETRIES ?? '3');
const CREDITS_REFRESH_RETRY_DELAY_MS = Number(process.env.TAVILY_CREDITS_REFRESH_RETRY_DELAY_MS ?? '1000');

type EligibleKey = TavilyKey & { apiKey: string };

class Mutex {
  private current: Promise<void> = Promise.resolve();
  async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    let release!: () => void;
    const next = new Promise<void>((r) => (release = r));
    const prev = this.current;
    this.current = prev.then(() => next);
    await prev;
    try {
      return await fn();
    } finally {
      release();
    }
  }
}

export class TavilyKeyPool {
  private readonly prisma: PrismaClient;
  private readonly encryptionKey: Buffer;
  private readonly getSelectionStrategy: () => Promise<TavilyKeySelectionStrategy>;
  private readonly mutex = new Mutex();

  constructor(opts: { prisma: PrismaClient; encryptionKey: Buffer; getSelectionStrategy: () => Promise<TavilyKeySelectionStrategy> }) {
    this.prisma = opts.prisma;
    this.encryptionKey = opts.encryptionKey;
    this.getSelectionStrategy = opts.getSelectionStrategy;
  }

  async preflightCreditsCheck(
    operation?: OperationType,
    params?: OperationParams
  ): Promise<
    | { ok: true }
    | {
        ok: false;
        status: number;
        error: string;
        retryAfterMs?: number;
      }
  > {
    const now = new Date();

    // Calculate required credits if operation is provided
    const requiredCredits = operation ? calculateOperationCost(operation, params).estimated : CREDITS_MIN_REMAINING;

    const cached = await this.prisma.tavilyKey.findFirst({
      where: {
        status: { in: ['active', 'cooldown'] },
        OR: [{ cooldownUntil: null }, { cooldownUntil: { lte: now } }],
        creditsExpiresAt: { gt: now },
        creditsRemaining: { gt: requiredCredits }
      },
      select: { id: true }
    });
    if (cached) return { ok: true };

    const candidate = await this.prisma.tavilyKey.findFirst({
      where: {
        status: { in: ['active', 'cooldown'] },
        OR: [{ cooldownUntil: null }, { cooldownUntil: { lte: now } }]
      },
      orderBy: [{ lastUsedAt: 'asc' }, { createdAt: 'asc' }]
    });
    if (!candidate) {
      return { ok: false, status: 503, error: 'No Tavily API keys configured' };
    }

    const refreshed = await this.refreshCredits(candidate, now, { force: true });
    if (refreshed.ok) {
      const remaining = refreshed.updated.creditsRemaining;
      if (typeof remaining === 'number' && remaining > requiredCredits) return { ok: true };
      if (typeof remaining === 'number' && remaining <= requiredCredits) {
        // Hybrid blocking: block expensive operations, allow cheap operations with warning
        if (operation && isExpensiveOperation(operation)) {
          return {
            ok: false,
            status: 429,
            error: `Insufficient credits for ${operation} operation (requires ${requiredCredits}, available ${remaining})`,
            retryAfterMs: CREDITS_COOLDOWN_MS
          };
        } else if (operation && remaining >= CREDITS_MIN_REMAINING) {
          // Allow cheap operations even if below required threshold
          console.warn(
            `[TavilyKeyPool] Allowing ${operation} operation with low credits (requires ${requiredCredits}, available ${remaining})`
          );
          return { ok: true };
        }
        return { ok: false, status: 429, error: 'Upstream quota exhausted', retryAfterMs: CREDITS_COOLDOWN_MS };
      }
    }

    return { ok: false, status: 503, error: 'Unable to refresh upstream credits', retryAfterMs: 10_000 };
  }

  async selectEligibleKey(
    operation?: OperationType,
    params?: OperationParams
  ): Promise<EligibleKey | null> {
    return await this.mutex.runExclusive(async () => {
      const selectionStrategy = await this.getSelectionStrategy();
      const now = new Date();
      const keys = await this.prisma.tavilyKey.findMany({
        where: {
          status: { in: ['active', 'cooldown'] },
          OR: [{ cooldownUntil: null }, { cooldownUntil: { lte: now } }]
        },
        orderBy: [{ lastUsedAt: 'asc' }, { createdAt: 'asc' }],
        take: 10
      });
      if (keys.length === 0) return null;

      // Calculate required credits if operation is provided
      const requiredCredits = operation ? calculateOperationCost(operation, params).estimated : CREDITS_MIN_REMAINING;

      for (const candidate of orderKeyCandidates(keys, selectionStrategy)) {
        const refreshed = await this.refreshCredits(candidate, now, { force: false });
        if (!refreshed.ok) continue;

        const remaining = refreshed.updated.creditsRemaining;
        if (typeof remaining !== 'number' || !Number.isFinite(remaining)) continue;

        // Check if key has sufficient credits for the operation
        if (remaining < requiredCredits) {
          // Hybrid logic: skip expensive operations, allow cheap operations
          if (operation && isExpensiveOperation(operation)) {
            console.log(
              `[TavilyKeyPool] Skipping key ${candidate.id.slice(0, 8)} for ${operation}: insufficient credits (requires ${requiredCredits}, available ${remaining})`
            );
            await this.markCooldown(candidate.id, new Date(Date.now() + CREDITS_COOLDOWN_MS));
            continue;
          } else if (operation && remaining >= CREDITS_MIN_REMAINING) {
            console.log(
              `[TavilyKeyPool] Allowing key ${candidate.id.slice(0, 8)} for ${operation} with low credits (requires ${requiredCredits}, available ${remaining})`
            );
            // Allow cheap operations to proceed
          } else {
            // No operation specified or credits below minimum
            await this.markCooldown(candidate.id, new Date(Date.now() + CREDITS_COOLDOWN_MS));
            continue;
          }
        }

        const data: any = { lastUsedAt: now };
        if (refreshed.updated.status === 'cooldown' && refreshed.updated.cooldownUntil && refreshed.updated.cooldownUntil.getTime() <= now.getTime()) {
          data.status = 'active';
          data.cooldownUntil = null;
        }

        const chosen = await this.prisma.tavilyKey.update({
          where: { id: refreshed.updated.id },
          data
        });
        const apiKey = decryptAes256Gcm(Buffer.from(chosen.keyEncrypted), this.encryptionKey);
        return { ...chosen, apiKey };
      }

      return null;
    });
  }

  async markCooldown(keyId: string, cooldownUntil: Date): Promise<void> {
    await this.prisma.tavilyKey.update({
      where: { id: keyId },
      data: { status: 'cooldown', cooldownUntil }
    });
  }

  async markInvalid(keyId: string): Promise<void> {
    await this.prisma.tavilyKey.update({
      where: { id: keyId },
      data: { status: 'invalid' }
    });
  }

  private isCreditsFresh(key: TavilyKey, now: Date): boolean {
    return (
      key.creditsExpiresAt instanceof Date &&
      key.creditsExpiresAt.getTime() > now.getTime() &&
      typeof key.creditsRemaining === 'number' &&
      Number.isFinite(key.creditsRemaining)
    );
  }

  private async refreshCredits(
    key: TavilyKey,
    now: Date,
    opts: { force: boolean }
  ): Promise<{ ok: true; updated: TavilyKey } | { ok: false; reason: 'locked' | 'invalid' | 'error' }> {
    if (!opts.force && this.isCreditsFresh(key, now)) return { ok: true, updated: key };

    const lockId = await tryAcquireCreditsRefreshLock(this.prisma, key.id, CREDITS_REFRESH_LOCK_MS);
    if (!lockId) {
      const checkedAtMs = key.creditsCheckedAt instanceof Date ? key.creditsCheckedAt.getTime() : null;
      const hasUsableCache =
        checkedAtMs !== null &&
        now.getTime() - checkedAtMs <= CREDITS_STALE_GRACE_MS &&
        typeof key.creditsRemaining === 'number' &&
        Number.isFinite(key.creditsRemaining) &&
        key.creditsRemaining > CREDITS_MIN_REMAINING;
      return hasUsableCache ? { ok: true, updated: key } : { ok: false, reason: 'locked' };
    }

    try {
      const apiKey = decryptAes256Gcm(Buffer.from(key.keyEncrypted), this.encryptionKey);
      const snapshot = await fetchTavilyCredits(apiKey, {
        timeoutMs: CREDITS_REFRESH_TIMEOUT_MS,
        maxRetries: CREDITS_REFRESH_MAX_RETRIES,
        retryDelayMs: CREDITS_REFRESH_RETRY_DELAY_MS
      });

      const expiresAt = new Date(now.getTime() + Math.max(1, CREDITS_TTL_MS));
      const remaining = snapshot.remaining;
      const shouldCooldown = typeof remaining === 'number' && remaining <= CREDITS_MIN_REMAINING;

      const data: any = {
        creditsCheckedAt: now,
        creditsExpiresAt: expiresAt,
        creditsKeyUsage: snapshot.keyUsage,
        creditsKeyLimit: snapshot.keyLimit,
        creditsKeyRemaining: snapshot.keyRemaining,
        creditsAccountPlanUsage: snapshot.accountPlanUsage,
        creditsAccountPlanLimit: snapshot.accountPlanLimit,
        creditsAccountPaygoUsage: snapshot.accountPaygoUsage,
        creditsAccountPaygoLimit: snapshot.accountPaygoLimit,
        creditsAccountRemaining: snapshot.accountRemaining,
        creditsRemaining: snapshot.remaining
      };

      if (shouldCooldown) {
        data.status = 'cooldown';
        data.cooldownUntil = new Date(now.getTime() + Math.max(1, CREDITS_COOLDOWN_MS));
      } else if (key.status === 'cooldown' && key.cooldownUntil && key.cooldownUntil.getTime() <= now.getTime()) {
        data.status = 'active';
        data.cooldownUntil = null;
      }

      const updated = await this.prisma.tavilyKey.update({
        where: { id: key.id },
        data
      });
      return { ok: true, updated };
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === 'Invalid API key') {
        await this.markInvalid(key.id);
        return { ok: false, reason: 'invalid' };
      }
      if (msg === 'Usage limit exceeded') {
        await this.markCooldown(key.id, new Date(Date.now() + Math.max(1, CREDITS_COOLDOWN_MS)));
        return { ok: false, reason: 'error' };
      }
      return { ok: false, reason: 'error' };
    } finally {
      await releaseCreditsRefreshLock(this.prisma, key.id, lockId).catch(() => {});
    }
  }

  async markActiveIfCooldownExpired(keyId: string): Promise<void> {
    const key = await this.prisma.tavilyKey.findUnique({ where: { id: keyId } });
    if (!key) return;
    if (key.status === 'cooldown' && key.cooldownUntil && key.cooldownUntil.getTime() <= Date.now()) {
      await this.prisma.tavilyKey.update({ where: { id: keyId }, data: { status: 'active', cooldownUntil: null } });
    }
  }
}

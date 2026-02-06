import type { PrismaClient } from '@mcp-nexus/db';
import {
  createBraveHttpClient,
  isBraveHttpError,
  QueuedRateGate,
  type BraveClient,
  type BraveLocalSearchParams,
  type BraveWebSearchParams
} from '@mcp-nexus/core';

import { createLoggingBraveClient } from './loggingClient.js';
import type { BraveKeyPool } from './keyPool.js';

export class RotatingBraveClient implements BraveClient {
  private readonly pool: BraveKeyPool;
  private readonly prisma: PrismaClient;
  private readonly maxRetries: number;
  private readonly gate: QueuedRateGate;
  private readonly timeoutMs: number;

  constructor(opts: { pool: BraveKeyPool; prisma: PrismaClient; maxRetries: number }) {
    this.pool = opts.pool;
    this.prisma = opts.prisma;
    this.maxRetries = opts.maxRetries;

    const minIntervalMsRaw = Number(process.env.BRAVE_MIN_INTERVAL_MS ?? '');
    const maxQpsRaw = Number(process.env.BRAVE_MAX_QPS ?? '1');
    const minIntervalMs =
      Number.isFinite(minIntervalMsRaw) && minIntervalMsRaw > 0
        ? Math.floor(minIntervalMsRaw)
        : minIntervalMsFromQps(maxQpsRaw);

    this.gate = new QueuedRateGate({ minIntervalMs });

    const timeoutMsRaw = Number(process.env.BRAVE_HTTP_TIMEOUT_MS ?? String(20_000));
    this.timeoutMs =
      Number.isFinite(timeoutMsRaw) && timeoutMsRaw > 0 ? Math.floor(timeoutMsRaw) : 20_000;
  }

  async webSearch(
    params: BraveWebSearchParams,
    opts?: { defaults?: Record<string, unknown>; maxWaitMs?: number }
  ): Promise<unknown> {
    return await this.withRotation(async (client) => {
      return await client.webSearch(params, opts);
    });
  }

  async localSearch(
    params: BraveLocalSearchParams,
    opts?: { defaults?: Record<string, unknown>; maxWaitMs?: number }
  ): Promise<unknown> {
    return await this.withRotation(async (client) => {
      return await client.localSearch(params, opts);
    });
  }

  private async withRotation<T>(fn: (client: BraveClient) => Promise<T>): Promise<T> {
    let attempt = 0;

    while (attempt <= this.maxRetries) {
      attempt += 1;

      const key = await this.pool.selectEligibleKey();
      if (!key) {
        throw new Error('No Brave API keys available');
      }

      const rawClient = createBraveHttpClient({
        apiKey: key.apiKey,
        gate: this.gate,
        timeoutMs: this.timeoutMs
      });

      const loggingClient = createLoggingBraveClient({
        client: rawClient,
        prisma: this.prisma,
        upstreamKeyId: key.id
      });

      try {
        return await fn(loggingClient);
      } catch (error: unknown) {
        if (isBraveHttpError(error)) {
          const status = error.status;

          if (status === 401 || status === 403) {
            await this.pool.markInvalid(key.id);
            continue;
          }

          if (status === 429 || status >= 500) {
            await this.pool.incrementFailureScore(key.id);
            continue;
          }
        }

        if (error instanceof Error && error.message === 'Invalid API key') {
          await this.pool.markInvalid(key.id);
          continue;
        }

        throw error;
      }
    }

    throw new Error('No Brave API keys available');
  }
}

function minIntervalMsFromQps(qps: number): number {
  if (!Number.isFinite(qps) || qps <= 0) return 1000;
  return Math.max(1, Math.ceil(1000 / qps));
}

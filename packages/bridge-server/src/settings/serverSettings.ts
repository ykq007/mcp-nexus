import type { PrismaClient } from '@mcp-tavily-bridge/db';
import { parseTavilyKeySelectionStrategy, type TavilyKeySelectionStrategy } from '@mcp-tavily-bridge/core';

const REFRESH_MS = Number(process.env.SERVER_SETTINGS_REFRESH_MS ?? '5000');
const KEY_TAVILY_STRATEGY = 'tavilyKeySelectionStrategy';

export class ServerSettings {
  private readonly prisma: PrismaClient;
  private readonly fallbackStrategy: TavilyKeySelectionStrategy;
  private cached: { strategy: TavilyKeySelectionStrategy; expiresAtMs: number } | null = null;
  private inFlight: Promise<TavilyKeySelectionStrategy> | null = null;

  constructor(opts: { prisma: PrismaClient; fallbackStrategy: TavilyKeySelectionStrategy }) {
    this.prisma = opts.prisma;
    this.fallbackStrategy = opts.fallbackStrategy;
  }

  async getTavilyKeySelectionStrategy(): Promise<TavilyKeySelectionStrategy> {
    const now = Date.now();
    if (this.cached && now < this.cached.expiresAtMs) return this.cached.strategy;
    if (this.inFlight) return this.inFlight;

    this.inFlight = (async () => {
      try {
        const row = await this.prisma.serverSetting.findUnique({ where: { key: KEY_TAVILY_STRATEGY } });
        const parsed = parseTavilyKeySelectionStrategy(row?.value, this.fallbackStrategy);
        this.cached = { strategy: parsed, expiresAtMs: Date.now() + Math.max(250, REFRESH_MS) };
        return parsed;
      } catch {
        const fallback = this.cached?.strategy ?? this.fallbackStrategy;
        this.cached = { strategy: fallback, expiresAtMs: Date.now() + Math.max(250, REFRESH_MS) };
        return fallback;
      } finally {
        this.inFlight = null;
      }
    })();

    return this.inFlight;
  }

  async setTavilyKeySelectionStrategy(next: TavilyKeySelectionStrategy): Promise<TavilyKeySelectionStrategy> {
    await this.prisma.serverSetting.upsert({
      where: { key: KEY_TAVILY_STRATEGY },
      create: { key: KEY_TAVILY_STRATEGY, value: next },
      update: { value: next }
    });
    this.cached = { strategy: next, expiresAtMs: Date.now() + Math.max(250, REFRESH_MS) };
    return next;
  }
}


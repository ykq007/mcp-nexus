import { DurableObject } from 'cloudflare:workers';

import type { Env } from '../env.js';

interface RateLimitState {
  count: number;
  windowStart: number;
}

/**
 * RateLimiter Durable Object
 *
 * Implements distributed rate limiting using sliding window algorithm.
 * Each client gets their own Durable Object instance for rate tracking.
 */
export class RateLimiter extends DurableObject<Env> {
  private state: RateLimitState = { count: 0, windowStart: 0 };

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  /**
   * Check if request should be rate limited
   */
  async checkLimit(limit: number, windowMs: number): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const now = Date.now();

    // Reset window if expired
    if (now - this.state.windowStart >= windowMs) {
      this.state = { count: 0, windowStart: now };
    }

    // Check if under limit
    if (this.state.count < limit) {
      this.state.count++;
      await this.ctx.storage.put('state', this.state);

      return {
        allowed: true,
        remaining: limit - this.state.count,
        resetAt: this.state.windowStart + windowMs,
      };
    }

    return {
      allowed: false,
      remaining: 0,
      resetAt: this.state.windowStart + windowMs,
    };
  }

  /**
   * Handle incoming requests
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '60', 10);
    const windowMs = parseInt(url.searchParams.get('window') || '60000', 10);

    const result = await this.checkLimit(limit, windowMs);

    return new Response(JSON.stringify(result), {
      status: result.allowed ? 200 : 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(result.resetAt),
      },
    });
  }
}

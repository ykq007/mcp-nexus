import type { Context } from 'hono';
import type { Env } from './env.js';

export type WorkerVariables = {
  clientTokenId?: string;
  clientTokenPrefix?: string;
  clientTokenAllowedTools?: string | null;
  clientTokenRateLimit?: number | null;
};

export type WorkerContext = Context<{
  Bindings: Env;
  Variables: WorkerVariables;
}>;


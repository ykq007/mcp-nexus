import { app } from './app.js';
import type { Env } from './env.js';

// Re-export Durable Object classes
export { McpSession } from './mcp/mcpSession.js';
export { RateLimiter } from './rateLimit/rateLimiter.js';

// Export the worker handler
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return app.fetch(request, env, ctx);
  },
};

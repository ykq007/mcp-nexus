import type { Context, Next } from 'hono';

import type { Env } from '../env.js';

/**
 * Middleware to validate admin API token
 */
export async function adminAuth(c: Context<{ Bindings: Env }>, next: Next): Promise<Response | void> {
  const authHeader = c.req.header('Authorization');

  if (!authHeader) {
    return c.json({ error: 'Authorization header required' }, 401);
  }

  const token = authHeader.replace('Bearer ', '');
  const expectedToken = c.env.ADMIN_API_TOKEN;

  if (!expectedToken) {
    console.error('ADMIN_API_TOKEN not configured');
    return c.json({ error: 'Server configuration error' }, 500);
  }

  // Constant-time comparison to prevent timing attacks
  if (!secureCompare(token, expectedToken)) {
    return c.json({ error: 'Invalid admin token' }, 401);
  }

  await next();
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

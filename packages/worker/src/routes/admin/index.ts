import { Hono } from 'hono';

import type { Env } from '../../env.js';
import { adminAuth } from '../../middleware/adminAuth.js';
import { D1Client, generateId } from '../../db/d1.js';
import { encrypt, maskApiKey, generateToken } from '../../crypto/crypto.js';

// Create admin router
const adminRouter = new Hono<{ Bindings: Env }>();

// Apply admin auth to all routes
adminRouter.use('*', adminAuth);

// ============ Tavily Keys ============

adminRouter.get('/tavily-keys', async (c) => {
  const db = new D1Client(c.env.DB);
  const keys = await db.getTavilyKeys();

  return c.json(keys.map(k => ({
    id: k.id,
    label: k.label,
    keyMasked: k.keyMasked,
    status: k.status,
    cooldownUntil: k.cooldownUntil,
    lastUsedAt: k.lastUsedAt,
    failureScore: k.failureScore,
    creditsRemaining: k.creditsRemaining,
    creditsCheckedAt: k.creditsCheckedAt,
    createdAt: k.createdAt,
    updatedAt: k.updatedAt,
  })));
});

adminRouter.post('/tavily-keys', async (c) => {
  const body = await c.req.json<{ label: string; key: string }>();
  const { label, key } = body;

  if (!label || !key) {
    return c.json({ error: 'label and key are required' }, 400);
  }

  const db = new D1Client(c.env.DB);

  // Encrypt the key
  const keyEncrypted = await encrypt(key, c.env.KEY_ENCRYPTION_SECRET);
  const keyMasked = maskApiKey(key);
  const id = generateId();

  await db.createTavilyKey({
    id,
    label,
    keyEncrypted: keyEncrypted.buffer as ArrayBuffer,
    keyMasked,
  });

  return c.json({
    id,
    label,
    keyMasked,
    status: 'active',
  }, 201);
});

adminRouter.put('/tavily-keys/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{ label?: string; status?: string }>();

  const db = new D1Client(c.env.DB);

  await db.updateTavilyKey(id, {
    label: body.label,
    status: body.status,
  });

  return c.json({
    id,
    label: body.label,
    status: body.status,
  });
});

adminRouter.delete('/tavily-keys/:id', async (c) => {
  const id = c.req.param('id');
  const db = new D1Client(c.env.DB);

  await db.deleteTavilyKey(id);
  return c.json({ success: true });
});

// ============ Brave Keys ============

adminRouter.get('/brave-keys', async (c) => {
  const db = new D1Client(c.env.DB);
  const keys = await db.getBraveKeys();

  return c.json(keys.map(k => ({
    id: k.id,
    label: k.label,
    keyMasked: k.keyMasked,
    status: k.status,
    lastUsedAt: k.lastUsedAt,
    failureScore: k.failureScore,
    createdAt: k.createdAt,
    updatedAt: k.updatedAt,
  })));
});

adminRouter.post('/brave-keys', async (c) => {
  const body = await c.req.json<{ label: string; key: string }>();
  const { label, key } = body;

  if (!label || !key) {
    return c.json({ error: 'label and key are required' }, 400);
  }

  const db = new D1Client(c.env.DB);

  const keyEncrypted = await encrypt(key, c.env.KEY_ENCRYPTION_SECRET);
  const keyMasked = maskApiKey(key);
  const id = generateId();

  await db.createBraveKey({
    id,
    label,
    keyEncrypted: keyEncrypted.buffer as ArrayBuffer,
    keyMasked,
  });

  return c.json({
    id,
    label,
    keyMasked,
    status: 'active',
  }, 201);
});

adminRouter.delete('/brave-keys/:id', async (c) => {
  const id = c.req.param('id');
  const db = new D1Client(c.env.DB);

  await db.deleteBraveKey(id);
  return c.json({ success: true });
});

// ============ Client Tokens ============

adminRouter.get('/tokens', async (c) => {
  const db = new D1Client(c.env.DB);
  const tokens = await db.getClientTokens();

  return c.json(tokens.map(t => ({
    id: t.id,
    description: t.description,
    tokenPrefix: t.tokenPrefix,
    scopesJson: t.scopesJson,
    expiresAt: t.expiresAt,
    revokedAt: t.revokedAt,
    createdAt: t.createdAt,
  })));
});

adminRouter.post('/tokens', async (c) => {
  const body = await c.req.json<{ description?: string; expiresAt?: string }>();

  const db = new D1Client(c.env.DB);

  // Generate a new token
  const token = generateToken(32);
  const tokenPrefix = token.substring(0, 8);
  const id = generateId();

  // Hash the token
  const encoder = new TextEncoder();
  const tokenData = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', tokenData);

  await db.createClientToken({
    id,
    description: body.description,
    tokenPrefix,
    tokenHash: hashBuffer,
    expiresAt: body.expiresAt,
  });

  // Return the full token only once (it can't be retrieved later)
  return c.json({
    id,
    token, // Only returned on creation
    tokenPrefix,
    description: body.description,
    expiresAt: body.expiresAt,
  }, 201);
});

adminRouter.delete('/tokens/:id', async (c) => {
  const id = c.req.param('id');
  const db = new D1Client(c.env.DB);

  // Soft delete by setting revokedAt
  await db.revokeClientToken(id);

  return c.json({ success: true });
});

// ============ Settings ============

adminRouter.get('/settings', async (c) => {
  const db = new D1Client(c.env.DB);
  const settings = await db.getServerSettings();

  const result: Record<string, string> = {};
  for (const setting of settings) {
    result[setting.key] = setting.value;
  }

  return c.json(result);
});

adminRouter.put('/settings', async (c) => {
  const body = await c.req.json<Record<string, string>>();
  const db = new D1Client(c.env.DB);

  for (const [key, value] of Object.entries(body)) {
    await db.upsertServerSetting(key, value);
  }

  return c.json({ success: true });
});

// ============ Usage Logs ============

adminRouter.get('/usage', async (c) => {
  const limit = parseInt(c.req.query('limit') || '100', 10);
  const offset = parseInt(c.req.query('offset') || '0', 10);
  const source = c.req.query('source') || 'all'; // tavily, brave, all

  const db = new D1Client(c.env.DB);

  const results: Array<{
    id: string;
    timestamp: string;
    toolName: string;
    outcome: string;
    latencyMs: number | null;
    source: string;
  }> = [];

  if (source === 'all' || source === 'tavily') {
    const tavilyLogs = await db.getTavilyUsageLogs(limit, offset);
    results.push(...tavilyLogs.map(log => ({ ...log, source: 'tavily' })));
  }

  if (source === 'all' || source === 'brave') {
    const braveLogs = await db.getBraveUsageLogs(limit, offset);
    results.push(...braveLogs.map(log => ({ ...log, source: 'brave' })));
  }

  // Sort combined results by timestamp
  results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return c.json(results.slice(0, limit));
});

export { adminRouter };

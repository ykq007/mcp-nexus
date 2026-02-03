import { D1Client } from '../db/d1.js';
import { decrypt } from '../crypto/crypto.js';

/**
 * Simple key pool for Cloudflare Workers
 * Selects an active key using round-robin strategy
 */
export async function selectTavilyKey(
  db: D1Client,
  encryptionSecret: string
): Promise<{ keyId: string; apiKey: string } | null> {
  const key = await db.getActiveTavilyKey();

  if (!key) return null;

  // Update lastUsedAt
  await db.updateTavilyKey(key.id, { lastUsedAt: new Date().toISOString() });

  // Decrypt the key
  const keyEncrypted = new Uint8Array(key.keyEncrypted);
  const apiKey = await decrypt(keyEncrypted, encryptionSecret);

  return { keyId: key.id, apiKey };
}

export async function selectBraveKey(
  db: D1Client,
  encryptionSecret: string
): Promise<{ keyId: string; apiKey: string } | null> {
  const key = await db.getActiveBraveKey();

  if (!key) return null;

  // Update lastUsedAt
  await db.updateBraveKey(key.id, { lastUsedAt: new Date().toISOString() });

  // Decrypt the key
  const keyEncrypted = new Uint8Array(key.keyEncrypted);
  const apiKey = await decrypt(keyEncrypted, encryptionSecret);

  return { keyId: key.id, apiKey };
}

export async function markTavilyKeyCooldown(
  db: D1Client,
  keyId: string,
  cooldownMs: number = 5 * 60 * 1000
): Promise<void> {
  await db.updateTavilyKey(keyId, {
    status: 'cooldown',
    cooldownUntil: new Date(Date.now() + cooldownMs).toISOString()
  });
}

export async function markTavilyKeyInvalid(
  db: D1Client,
  keyId: string
): Promise<void> {
  await db.updateTavilyKey(keyId, { status: 'invalid' });
}

export async function markBraveKeyInvalid(
  db: D1Client,
  keyId: string
): Promise<void> {
  await db.updateBraveKey(keyId, { status: 'invalid' });
}

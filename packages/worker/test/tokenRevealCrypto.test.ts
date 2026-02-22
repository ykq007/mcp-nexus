import { describe, expect, it } from 'vitest';

import { decrypt, encrypt } from '../src/crypto/crypto.js';

describe('token reveal crypto', () => {
  it('encrypt/decrypt roundtrips plaintext token', async () => {
    const keyBytes = crypto.getRandomValues(new Uint8Array(32));
    const keyBase64 = Buffer.from(keyBytes).toString('base64');

    const token = 'test-token-plaintext';
    const encrypted = await encrypt(token, keyBase64);
    const decrypted = await decrypt(encrypted, keyBase64);

    expect(decrypted).toBe(token);
  });

  it('accepts base64url (no padding) KEY_ENCRYPTION_SECRET', async () => {
    const keyBytes = crypto.getRandomValues(new Uint8Array(32));
    const keyBase64 = Buffer.from(keyBytes).toString('base64');
    const keyBase64Url = keyBase64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

    const token = 'test-token-plaintext';
    const encrypted = await encrypt(token, keyBase64Url);
    const decrypted = await decrypt(encrypted, keyBase64Url);

    expect(decrypted).toBe(token);
  });

  it('accepts hex KEY_ENCRYPTION_SECRET', async () => {
    const keyBytes = crypto.getRandomValues(new Uint8Array(32));
    const keyHex = Buffer.from(keyBytes).toString('hex');

    const token = 'test-token-plaintext';
    const encrypted = await encrypt(token, keyHex);
    const decrypted = await decrypt(encrypted, keyHex);

    expect(decrypted).toBe(token);
  });

  it('accepts 0x-prefixed hex KEY_ENCRYPTION_SECRET', async () => {
    const keyBytes = crypto.getRandomValues(new Uint8Array(32));
    const keyHex = Buffer.from(keyBytes).toString('hex');

    const token = 'test-token-plaintext';
    const encrypted = await encrypt(token, `0x${keyHex}`);
    const decrypted = await decrypt(encrypted, `0x${keyHex}`);

    expect(decrypted).toBe(token);
  });

  it('accepts quoted base64 KEY_ENCRYPTION_SECRET', async () => {
    const keyBytes = crypto.getRandomValues(new Uint8Array(32));
    const keyBase64 = Buffer.from(keyBytes).toString('base64');

    const token = 'test-token-plaintext';
    const encrypted = await encrypt(token, `"${keyBase64}"`);
    const decrypted = await decrypt(encrypted, `"${keyBase64}"`);

    expect(decrypted).toBe(token);
  });

  it('accepts base64 KEY_ENCRYPTION_SECRET with surrounding whitespace', async () => {
    const keyBytes = crypto.getRandomValues(new Uint8Array(32));
    const keyBase64 = Buffer.from(keyBytes).toString('base64');
    const keyWithWhitespace = `  \n\t${keyBase64}\n  `;

    const token = 'test-token-plaintext';
    const encrypted = await encrypt(token, keyWithWhitespace);
    const decrypted = await decrypt(encrypted, keyWithWhitespace);

    expect(decrypted).toBe(token);
  });

  it('throws actionable error for invalid base64 KEY_ENCRYPTION_SECRET', async () => {
    await expect(encrypt('test-token-plaintext', 'not-base64!!!!')).rejects.toThrow('Invalid KEY_ENCRYPTION_SECRET');
  });

  it('throws actionable error when KEY_ENCRYPTION_SECRET decodes to non-32-byte key', async () => {
    const shortKeyBase64 = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64');
    await expect(encrypt('test-token-plaintext', shortKeyBase64)).rejects.toThrow('must decode to 32 bytes');
  });
});

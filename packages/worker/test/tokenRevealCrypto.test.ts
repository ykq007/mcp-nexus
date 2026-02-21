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
});


import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { decryptAes256Gcm, encryptAes256Gcm } from '../src/crypto/crypto.js';

describe('token reveal crypto', () => {
  it('encrypt/decrypt roundtrips plaintext token', () => {
    const key = randomBytes(32);
    const token = 'mcp_testprefix.0123456789abcdef';

    const encrypted = encryptAes256Gcm(token, key);
    const decrypted = decryptAes256Gcm(encrypted, key);

    expect(decrypted).toBe(token);
  });
});


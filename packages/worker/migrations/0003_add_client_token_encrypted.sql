-- Migration: Add tokenEncrypted to ClientToken
-- Enables admin-only token reveal by persisting an encrypted copy of the plaintext token.

ALTER TABLE ClientToken ADD COLUMN tokenEncrypted BLOB;


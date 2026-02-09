-- Migration: Add allowedTools and rateLimit to ClientToken
-- Phase 3.4: Scoped client tokens
-- Phase 3.5: Fine-grained rate limiting

ALTER TABLE ClientToken ADD COLUMN allowedTools TEXT;
ALTER TABLE ClientToken ADD COLUMN rateLimit INTEGER;

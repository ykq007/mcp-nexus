-- Add encrypted token material for admin re-reveal support.
ALTER TABLE "ClientToken" ADD COLUMN "tokenEncrypted" BLOB;


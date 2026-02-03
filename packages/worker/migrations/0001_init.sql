-- Migration: 0001_init.sql
-- Generated from Prisma schema for Cloudflare D1
-- Created: 2026-02-03

-- TavilyKey table
CREATE TABLE IF NOT EXISTS "TavilyKey" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "label" TEXT NOT NULL UNIQUE,
    "keyEncrypted" BLOB NOT NULL,
    "keyMasked" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "cooldownUntil" DATETIME,
    "lastUsedAt" DATETIME,
    "failureScore" INTEGER NOT NULL DEFAULT 0,
    "creditsCheckedAt" DATETIME,
    "creditsExpiresAt" DATETIME,
    "creditsKeyUsage" REAL,
    "creditsKeyLimit" REAL,
    "creditsKeyRemaining" REAL,
    "creditsAccountPlanUsage" REAL,
    "creditsAccountPlanLimit" REAL,
    "creditsAccountPaygoUsage" REAL,
    "creditsAccountPaygoLimit" REAL,
    "creditsAccountRemaining" REAL,
    "creditsRemaining" REAL,
    "creditsRefreshLockUntil" DATETIME,
    "creditsRefreshLockId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS "TavilyKey_status_cooldownUntil_lastUsedAt_idx" ON "TavilyKey"("status", "cooldownUntil", "lastUsedAt");
CREATE INDEX IF NOT EXISTS "TavilyKey_creditsExpiresAt_creditsRemaining_idx" ON "TavilyKey"("creditsExpiresAt", "creditsRemaining");
CREATE INDEX IF NOT EXISTS "TavilyKey_creditsRefreshLockUntil_idx" ON "TavilyKey"("creditsRefreshLockUntil");

-- BraveKey table
CREATE TABLE IF NOT EXISTS "BraveKey" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "label" TEXT NOT NULL UNIQUE,
    "keyEncrypted" BLOB NOT NULL,
    "keyMasked" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastUsedAt" DATETIME,
    "failureScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS "BraveKey_status_lastUsedAt_idx" ON "BraveKey"("status", "lastUsedAt");

-- ClientToken table
CREATE TABLE IF NOT EXISTS "ClientToken" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "description" TEXT,
    "tokenPrefix" TEXT NOT NULL UNIQUE,
    "tokenHash" BLOB NOT NULL,
    "scopesJson" TEXT NOT NULL DEFAULT '[]',
    "expiresAt" DATETIME,
    "revokedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "ClientToken_revokedAt_expiresAt_idx" ON "ClientToken"("revokedAt", "expiresAt");

-- AdminUser table
CREATE TABLE IF NOT EXISTS "AdminUser" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "username" TEXT NOT NULL UNIQUE,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- AuditLog table
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorAdminId" TEXT,
    "eventType" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "outcome" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "detailsJson" TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");
CREATE INDEX IF NOT EXISTS "AuditLog_eventType_idx" ON "AuditLog"("eventType");
CREATE INDEX IF NOT EXISTS "AuditLog_outcome_idx" ON "AuditLog"("outcome");
CREATE INDEX IF NOT EXISTS "AuditLog_resourceType_resourceId_idx" ON "AuditLog"("resourceType", "resourceId");
CREATE INDEX IF NOT EXISTS "AuditLog_actorAdminId_idx" ON "AuditLog"("actorAdminId");

-- ResearchJob table
CREATE TABLE IF NOT EXISTS "ResearchJob" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "clientTokenId" TEXT NOT NULL,
    "upstreamKeyId" TEXT NOT NULL,
    "upstreamJobId" TEXT NOT NULL UNIQUE,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("clientTokenId") REFERENCES "ClientToken"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("upstreamKeyId") REFERENCES "TavilyKey"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ResearchJob_clientTokenId_upstreamKeyId_idx" ON "ResearchJob"("clientTokenId", "upstreamKeyId");

-- TavilyToolUsage table
CREATE TABLE IF NOT EXISTS "TavilyToolUsage" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "toolName" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "latencyMs" INTEGER,
    "clientTokenId" TEXT NOT NULL,
    "clientTokenPrefix" TEXT,
    "upstreamKeyId" TEXT,
    "queryHash" TEXT,
    "queryPreview" TEXT,
    "argsJson" TEXT NOT NULL DEFAULT '{}',
    "errorMessage" TEXT,
    FOREIGN KEY ("clientTokenId") REFERENCES "ClientToken"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("upstreamKeyId") REFERENCES "TavilyKey"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "TavilyToolUsage_timestamp_idx" ON "TavilyToolUsage"("timestamp");
CREATE INDEX IF NOT EXISTS "TavilyToolUsage_toolName_idx" ON "TavilyToolUsage"("toolName");
CREATE INDEX IF NOT EXISTS "TavilyToolUsage_outcome_idx" ON "TavilyToolUsage"("outcome");
CREATE INDEX IF NOT EXISTS "TavilyToolUsage_clientTokenId_timestamp_idx" ON "TavilyToolUsage"("clientTokenId", "timestamp");
CREATE INDEX IF NOT EXISTS "TavilyToolUsage_queryHash_idx" ON "TavilyToolUsage"("queryHash");
CREATE INDEX IF NOT EXISTS "TavilyToolUsage_upstreamKeyId_idx" ON "TavilyToolUsage"("upstreamKeyId");

-- BraveToolUsage table
CREATE TABLE IF NOT EXISTS "BraveToolUsage" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "toolName" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "latencyMs" INTEGER,
    "clientTokenId" TEXT NOT NULL,
    "clientTokenPrefix" TEXT,
    "upstreamKeyId" TEXT,
    "queryHash" TEXT,
    "queryPreview" TEXT,
    "argsJson" TEXT NOT NULL DEFAULT '{}',
    "errorMessage" TEXT,
    FOREIGN KEY ("clientTokenId") REFERENCES "ClientToken"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("upstreamKeyId") REFERENCES "BraveKey"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "BraveToolUsage_timestamp_idx" ON "BraveToolUsage"("timestamp");
CREATE INDEX IF NOT EXISTS "BraveToolUsage_toolName_idx" ON "BraveToolUsage"("toolName");
CREATE INDEX IF NOT EXISTS "BraveToolUsage_outcome_idx" ON "BraveToolUsage"("outcome");
CREATE INDEX IF NOT EXISTS "BraveToolUsage_clientTokenId_timestamp_idx" ON "BraveToolUsage"("clientTokenId", "timestamp");
CREATE INDEX IF NOT EXISTS "BraveToolUsage_queryHash_idx" ON "BraveToolUsage"("queryHash");
CREATE INDEX IF NOT EXISTS "BraveToolUsage_upstreamKeyId_idx" ON "BraveToolUsage"("upstreamKeyId");

-- ServerSetting table
CREATE TABLE IF NOT EXISTS "ServerSetting" (
    "key" TEXT PRIMARY KEY NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

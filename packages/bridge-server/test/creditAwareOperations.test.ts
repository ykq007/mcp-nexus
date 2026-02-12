import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TavilyKeyPool } from '../src/tavily/keyPool.js';
import { encryptAes256Gcm } from '../src/crypto/crypto.js';
import type { PrismaClient, TavilyKey } from '@mcp-nexus/db';

describe('creditAwareOperations', () => {
  let mockPrisma: any;
  let keyPool: TavilyKeyPool;
  let encryptionKey: Buffer;

  beforeEach(() => {
    encryptionKey = Buffer.from('0'.repeat(64), 'hex');

    mockPrisma = {
      tavilyKey: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn()
      }
    };

    keyPool = new TavilyKeyPool({
      prisma: mockPrisma as unknown as PrismaClient,
      encryptionKey,
      getSelectionStrategy: async () => 'round_robin' as const
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('preflightCreditsCheck', () => {
    it('blocks expensive operations (crawl) when credits are insufficient', async () => {
      const now = new Date();

      // First call: no cached key with sufficient credits
      mockPrisma.tavilyKey.findFirst.mockResolvedValueOnce(null);

      // Second call: find a candidate key
      const candidateKey: Partial<TavilyKey> = {
        id: 'key_1',
        keyEncrypted: Buffer.from('encrypted'),
        status: 'active',
        cooldownUntil: null,
        creditsRemaining: 5, // Only 5 credits, but crawl needs ~17.5
        creditsExpiresAt: new Date(now.getTime() + 60000),
        creditsCheckedAt: now,
        creditsRefreshLockUntil: null,
        creditsRefreshLockId: null,
        lastUsedAt: now,
        createdAt: now
      };
      mockPrisma.tavilyKey.findFirst.mockResolvedValueOnce(candidateKey);

      // Mock updateMany for lock acquisition (should fail to force using stale cache)
      mockPrisma.tavilyKey.updateMany.mockResolvedValue({ count: 0 });

      const result = await keyPool.preflightCreditsCheck('crawl', { limit: 50 });

      expect(result.ok).toBe(false);
      expect(result.status).toBe(429);
      expect(result.error).toContain('Insufficient credits for crawl');
      expect(result.error).toContain('requires 17.5');
      expect(result.error).toContain('available 5');
    });

    it('allows cheap operations (search) when credits are low but above minimum', async () => {
      const now = new Date();

      // First call: no cached key
      mockPrisma.tavilyKey.findFirst.mockResolvedValueOnce(null);

      // Second call: find a candidate with low credits
      const candidateKey: Partial<TavilyKey> = {
        id: 'key_1',
        keyEncrypted: Buffer.from('encrypted'),
        status: 'active',
        cooldownUntil: null,
        creditsRemaining: 1.5, // Low credits but above minimum (1)
        creditsExpiresAt: new Date(now.getTime() + 60000),
        creditsCheckedAt: now,
        creditsRefreshLockUntil: null,
        creditsRefreshLockId: null,
        lastUsedAt: now,
        createdAt: now
      };
      mockPrisma.tavilyKey.findFirst.mockResolvedValueOnce(candidateKey);

      // Mock updateMany for lock acquisition (should fail to use stale cache)
      mockPrisma.tavilyKey.updateMany.mockResolvedValue({ count: 0 });

      const result = await keyPool.preflightCreditsCheck('search', { search_depth: 'basic' });

      expect(result.ok).toBe(true);
    });

    it('allows all operations when credits are sufficient', async () => {
      const now = new Date();

      // Mock a key with plenty of credits
      const keyWithCredits: Partial<TavilyKey> = {
        id: 'key_1',
        keyEncrypted: Buffer.from('encrypted'),
        status: 'active',
        cooldownUntil: null,
        creditsRemaining: 100,
        creditsExpiresAt: new Date(now.getTime() + 60000),
        creditsCheckedAt: now,
        creditsRefreshLockUntil: null,
        creditsRefreshLockId: null,
        lastUsedAt: now,
        createdAt: now
      };

      mockPrisma.tavilyKey.findFirst.mockResolvedValue(keyWithCredits);

      // Test expensive operation (crawl)
      const crawlResult = await keyPool.preflightCreditsCheck('crawl', { limit: 50 });
      expect(crawlResult.ok).toBe(true);

      // Test cheap operation (search)
      const searchResult = await keyPool.preflightCreditsCheck('search', { search_depth: 'basic' });
      expect(searchResult.ok).toBe(true);

      // Test research
      const researchResult = await keyPool.preflightCreditsCheck('research', { model: 'mini' });
      expect(researchResult.ok).toBe(true);
    });

    it('maintains backward compatibility when no operation is specified', async () => {
      const now = new Date();

      const keyWithMinimalCredits: Partial<TavilyKey> = {
        id: 'key_1',
        keyEncrypted: Buffer.from('encrypted'),
        status: 'active',
        cooldownUntil: null,
        creditsRemaining: 2, // Above minimum (1)
        creditsExpiresAt: new Date(now.getTime() + 60000),
        creditsCheckedAt: now,
        creditsRefreshLockUntil: null,
        creditsRefreshLockId: null,
        lastUsedAt: now,
        createdAt: now
      };

      mockPrisma.tavilyKey.findFirst.mockResolvedValue(keyWithMinimalCredits);

      const result = await keyPool.preflightCreditsCheck();
      expect(result.ok).toBe(true);
    });
  });

  describe('selectEligibleKey', () => {
    it('skips keys with insufficient credits for expensive operations', async () => {
      const now = new Date();

      const keys: Partial<TavilyKey>[] = [
        {
          id: 'key_1',
          keyEncrypted: encryptAes256Gcm('tvly-test1', encryptionKey),
          status: 'active',
          cooldownUntil: null,
          creditsRemaining: 5, // Insufficient for crawl
          creditsExpiresAt: new Date(now.getTime() + 60000),
          creditsCheckedAt: now,
          creditsRefreshLockUntil: null,
          creditsRefreshLockId: null,
          lastUsedAt: now,
          createdAt: now
        },
        {
          id: 'key_2',
          keyEncrypted: encryptAes256Gcm('tvly-test2', encryptionKey),
          status: 'active',
          cooldownUntil: null,
          creditsRemaining: 50, // Sufficient for crawl
          creditsExpiresAt: new Date(now.getTime() + 60000),
          creditsCheckedAt: now,
          creditsRefreshLockUntil: null,
          creditsRefreshLockId: null,
          lastUsedAt: now,
          createdAt: now
        }
      ];

      mockPrisma.tavilyKey.findMany.mockResolvedValue(keys);
      mockPrisma.tavilyKey.updateMany.mockResolvedValue({ count: 0 }); // Lock acquisition fails, use stale
      mockPrisma.tavilyKey.update.mockImplementation(async ({ where }: any) => {
        return keys.find(k => k.id === where.id);
      });

      const result = await keyPool.selectEligibleKey('crawl', { limit: 50 });

      expect(result).not.toBeNull();
      expect(result?.id).toBe('key_2'); // Should skip key_1 and select key_2
    });

    it('allows keys with low credits for cheap operations', async () => {
      const now = new Date();

      const keys: Partial<TavilyKey>[] = [
        {
          id: 'key_1',
          keyEncrypted: encryptAes256Gcm('tvly-test1', encryptionKey),
          status: 'active',
          cooldownUntil: null,
          creditsRemaining: 1.5, // Low but sufficient for search
          creditsExpiresAt: new Date(now.getTime() + 60000),
          creditsCheckedAt: now,
          creditsRefreshLockUntil: null,
          creditsRefreshLockId: null,
          lastUsedAt: now,
          createdAt: now
        }
      ];

      mockPrisma.tavilyKey.findMany.mockResolvedValue(keys);
      mockPrisma.tavilyKey.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.tavilyKey.update.mockResolvedValue(keys[0]);

      const result = await keyPool.selectEligibleKey('search', { search_depth: 'basic' });

      expect(result).not.toBeNull();
      expect(result?.id).toBe('key_1');
    });

    it('returns null when all keys have insufficient credits', async () => {
      const now = new Date();

      const keys: Partial<TavilyKey>[] = [
        {
          id: 'key_1',
          keyEncrypted: Buffer.from('encrypted_1'),
          status: 'active',
          cooldownUntil: null,
          creditsRemaining: 0.5, // Insufficient
          creditsExpiresAt: new Date(now.getTime() + 60000),
          creditsCheckedAt: now,
          creditsRefreshLockUntil: null,
          creditsRefreshLockId: null,
          lastUsedAt: now,
          createdAt: now
        }
      ];

      mockPrisma.tavilyKey.findMany.mockResolvedValue(keys);
      mockPrisma.tavilyKey.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.tavilyKey.update.mockResolvedValue(keys[0]);

      const result = await keyPool.selectEligibleKey('crawl', { limit: 50 });

      expect(result).toBeNull();
    });

    it('automatically rotates to next key when first has insufficient credits', async () => {
      const now = new Date();

      const keys: Partial<TavilyKey>[] = [
        {
          id: 'key_1',
          keyEncrypted: encryptAes256Gcm('tvly-test1', encryptionKey),
          status: 'active',
          cooldownUntil: null,
          creditsRemaining: 2, // Insufficient for research
          creditsExpiresAt: new Date(now.getTime() + 60000),
          creditsCheckedAt: now,
          creditsRefreshLockUntil: null,
          creditsRefreshLockId: null,
          lastUsedAt: now,
          createdAt: now
        },
        {
          id: 'key_2',
          keyEncrypted: encryptAes256Gcm('tvly-test2', encryptionKey),
          status: 'active',
          cooldownUntil: null,
          creditsRemaining: 30, // Sufficient for research mini
          creditsExpiresAt: new Date(now.getTime() + 60000),
          creditsCheckedAt: now,
          creditsRefreshLockUntil: null,
          creditsRefreshLockId: null,
          lastUsedAt: now,
          createdAt: now
        }
      ];

      mockPrisma.tavilyKey.findMany.mockResolvedValue(keys);
      mockPrisma.tavilyKey.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.tavilyKey.update.mockImplementation(async ({ where }: any) => {
        return keys.find(k => k.id === where.id);
      });

      const result = await keyPool.selectEligibleKey('research', { model: 'mini' });

      expect(result).not.toBeNull();
      expect(result?.id).toBe('key_2');
    });
  });

  describe('research operation with variable cost', () => {
    it('handles mini model cost estimation', async () => {
      const now = new Date();

      const keys: Partial<TavilyKey>[] = [
        {
          id: 'key_1',
          keyEncrypted: encryptAes256Gcm('tvly-test1', encryptionKey),
          status: 'active',
          cooldownUntil: null,
          creditsRemaining: 30, // Sufficient for mini (estimated 25)
          creditsExpiresAt: new Date(now.getTime() + 60000),
          creditsCheckedAt: now,
          creditsRefreshLockUntil: null,
          creditsRefreshLockId: null,
          lastUsedAt: now,
          createdAt: now
        }
      ];

      mockPrisma.tavilyKey.findMany.mockResolvedValue(keys);
      mockPrisma.tavilyKey.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.tavilyKey.update.mockResolvedValue(keys[0]);

      const result = await keyPool.selectEligibleKey('research', { model: 'mini' });

      expect(result).not.toBeNull();
      expect(result?.id).toBe('key_1');
    });

    it('blocks pro model when credits insufficient', async () => {
      const now = new Date();

      const keys: Partial<TavilyKey>[] = [
        {
          id: 'key_1',
          keyEncrypted: Buffer.from('encrypted_1'),
          status: 'active',
          cooldownUntil: null,
          creditsRemaining: 40, // Insufficient for pro (estimated 100)
          creditsExpiresAt: new Date(now.getTime() + 60000),
          creditsCheckedAt: now,
          creditsRefreshLockUntil: null,
          creditsRefreshLockId: null,
          lastUsedAt: now,
          createdAt: now
        }
      ];

      mockPrisma.tavilyKey.findMany.mockResolvedValue(keys);
      mockPrisma.tavilyKey.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.tavilyKey.update.mockResolvedValue(keys[0]);

      const result = await keyPool.selectEligibleKey('research', { model: 'pro' });

      expect(result).toBeNull();
    });
  });
});

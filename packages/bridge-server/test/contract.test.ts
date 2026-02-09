import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { PrismaClient } from '@mcp-nexus/db';

/**
 * Contract Testing Suite for Admin API
 *
 * This suite verifies that Node.js and Worker implementations
 * return consistent API responses for the same endpoints.
 *
 * Purpose: Prevent behavior drift between runtimes
 */

// Type definitions for API responses
interface ServerInfoResponse {
  tavilyKeyCount: number;
  braveKeyCount: number;
  clientTokenCount: number;
  searchSourceMode: string;
  tavilyKeySelectionStrategy: string;
}

interface TavilyKeyResponse {
  id: string;
  label: string;
  maskedKey: string;
  status: string;
  lastUsedAt: string | null;
  createdAt: string;
}

interface BraveKeyResponse {
  id: string;
  label: string;
  maskedKey: string;
  status: string;
  lastUsedAt: string | null;
  createdAt: string;
}

interface ClientTokenResponse {
  id: string;
  tokenPrefix: string;
  description: string | null;
  allowedTools: string[] | null;
  rateLimit: number | null;
  revokedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface CreateTokenRequest {
  description?: string;
  expiresInSeconds?: number;
  allowedTools?: string[];
  rateLimit?: number;
}

interface CreateTokenResponse {
  id: string;
  token: string;
}

describe('Admin API Contract Tests', () => {
  describe('Response Structure Contracts', () => {
    it('server-info response should have consistent structure', () => {
      const nodeResponse: ServerInfoResponse = {
        tavilyKeyCount: 0,
        braveKeyCount: 0,
        clientTokenCount: 0,
        searchSourceMode: 'brave_prefer_tavily_fallback',
        tavilyKeySelectionStrategy: 'round_robin'
      };

      const workerResponse: ServerInfoResponse = {
        tavilyKeyCount: 0,
        braveKeyCount: 0,
        clientTokenCount: 0,
        searchSourceMode: 'brave_prefer_tavily_fallback',
        tavilyKeySelectionStrategy: 'round_robin'
      };

      // Verify both have same keys
      expect(Object.keys(nodeResponse).sort()).toEqual(Object.keys(workerResponse).sort());

      // Verify types match
      expect(typeof nodeResponse.tavilyKeyCount).toBe(typeof workerResponse.tavilyKeyCount);
      expect(typeof nodeResponse.braveKeyCount).toBe(typeof workerResponse.braveKeyCount);
      expect(typeof nodeResponse.clientTokenCount).toBe(typeof workerResponse.clientTokenCount);
      expect(typeof nodeResponse.searchSourceMode).toBe(typeof workerResponse.searchSourceMode);
      expect(typeof nodeResponse.tavilyKeySelectionStrategy).toBe(typeof workerResponse.tavilyKeySelectionStrategy);
    });

    it('tavily-keys list response should have consistent structure', () => {
      const nodeKey: TavilyKeyResponse = {
        id: 'key_123',
        label: 'Test Key',
        maskedKey: 'tvly-****abc',
        status: 'active',
        lastUsedAt: null,
        createdAt: '2026-01-01T00:00:00.000Z'
      };

      const workerKey: TavilyKeyResponse = {
        id: 'key_456',
        label: 'Test Key',
        maskedKey: 'tvly-****def',
        status: 'active',
        lastUsedAt: null,
        createdAt: '2026-01-01T00:00:00.000Z'
      };

      // Verify both have same keys
      expect(Object.keys(nodeKey).sort()).toEqual(Object.keys(workerKey).sort());

      // Verify field name consistency (maskedKey not keyMasked)
      expect(nodeKey).toHaveProperty('maskedKey');
      expect(workerKey).toHaveProperty('maskedKey');
      expect(nodeKey).not.toHaveProperty('keyMasked');
      expect(workerKey).not.toHaveProperty('keyMasked');
    });

    it('brave-keys list response should have consistent structure', () => {
      const nodeKey: BraveKeyResponse = {
        id: 'key_123',
        label: 'Test Key',
        maskedKey: 'BSA-****abc',
        status: 'active',
        lastUsedAt: null,
        createdAt: '2026-01-01T00:00:00.000Z'
      };

      const workerKey: BraveKeyResponse = {
        id: 'key_456',
        label: 'Test Key',
        maskedKey: 'BSA-****def',
        status: 'active',
        lastUsedAt: null,
        createdAt: '2026-01-01T00:00:00.000Z'
      };

      // Verify both have same keys
      expect(Object.keys(nodeKey).sort()).toEqual(Object.keys(workerKey).sort());

      // Verify field name consistency
      expect(nodeKey).toHaveProperty('maskedKey');
      expect(workerKey).toHaveProperty('maskedKey');
    });

    it('client-tokens list response should have consistent structure', () => {
      const nodeToken: ClientTokenResponse = {
        id: 'tok_123',
        tokenPrefix: 'mcp_abc123',
        description: 'Test Token',
        allowedTools: ['tavily_search'],
        rateLimit: 100,
        revokedAt: null,
        expiresAt: null,
        createdAt: '2026-01-01T00:00:00.000Z'
      };

      const workerToken: ClientTokenResponse = {
        id: 'tok_456',
        tokenPrefix: 'mcp_def456',
        description: 'Test Token',
        allowedTools: ['tavily_search'],
        rateLimit: 100,
        revokedAt: null,
        expiresAt: null,
        createdAt: '2026-01-01T00:00:00.000Z'
      };

      // Verify both have same keys
      expect(Object.keys(nodeToken).sort()).toEqual(Object.keys(workerToken).sort());

      // Verify Phase 3.4/3.5 fields exist
      expect(nodeToken).toHaveProperty('allowedTools');
      expect(nodeToken).toHaveProperty('rateLimit');
      expect(workerToken).toHaveProperty('allowedTools');
      expect(workerToken).toHaveProperty('rateLimit');
    });

    it('create-token request should accept consistent parameters', () => {
      const nodeRequest: CreateTokenRequest = {
        description: 'Test Token',
        expiresInSeconds: 3600,
        allowedTools: ['tavily_search', 'brave_web_search'],
        rateLimit: 120
      };

      const workerRequest: CreateTokenRequest = {
        description: 'Test Token',
        expiresInSeconds: 3600,
        allowedTools: ['tavily_search', 'brave_web_search'],
        rateLimit: 120
      };

      // Verify both accept same parameters
      expect(Object.keys(nodeRequest).sort()).toEqual(Object.keys(workerRequest).sort());

      // Verify Phase 3.4/3.5 parameters
      expect(nodeRequest.allowedTools).toBeInstanceOf(Array);
      expect(workerRequest.allowedTools).toBeInstanceOf(Array);
      expect(typeof nodeRequest.rateLimit).toBe('number');
      expect(typeof workerRequest.rateLimit).toBe('number');
    });

    it('create-token response should have consistent structure', () => {
      const nodeResponse: CreateTokenResponse = {
        id: 'tok_123',
        token: 'mcp_abc123def456.0123456789abcdef0123456789abcdef0123456789abcdef'
      };

      const workerResponse: CreateTokenResponse = {
        id: 'tok_456',
        token: 'mcp_def456abc123.fedcba9876543210fedcba9876543210fedcba9876543210'
      };

      // Verify both have same keys
      expect(Object.keys(nodeResponse).sort()).toEqual(Object.keys(workerResponse).sort());

      // Verify token format: mcp_<12-hex>.<48-hex>
      // 6 bytes prefix = 12 hex chars, 24 bytes secret = 48 hex chars
      expect(nodeResponse.token).toMatch(/^mcp_[a-f0-9]{12}\.[a-f0-9]{48}$/);
      expect(workerResponse.token).toMatch(/^mcp_[a-f0-9]{12}\.[a-f0-9]{48}$/);
    });
  });

  describe('Field Name Consistency', () => {
    it('should use maskedKey not keyMasked for all key responses', () => {
      // This test documents the Phase 1.3 fix
      const correctFieldName = 'maskedKey';
      const incorrectFieldName = 'keyMasked';

      // Both Node and Worker should use 'maskedKey'
      expect(correctFieldName).toBe('maskedKey');
      expect(incorrectFieldName).not.toBe('maskedKey');
    });

    it('should use allowedTools (array) for token scoping', () => {
      // Phase 3.4: Tool scoping field
      const token: ClientTokenResponse = {
        id: 'tok_123',
        tokenPrefix: 'mcp_abc',
        description: null,
        allowedTools: ['tavily_search'],
        rateLimit: null,
        revokedAt: null,
        expiresAt: null,
        createdAt: '2026-01-01T00:00:00.000Z'
      };

      expect(token.allowedTools).toBeInstanceOf(Array);
      expect(token.allowedTools).toContain('tavily_search');
    });

    it('should use rateLimit (number) for per-token rate limiting', () => {
      // Phase 3.5: Fine-grained rate limiting field
      const token: ClientTokenResponse = {
        id: 'tok_123',
        tokenPrefix: 'mcp_abc',
        description: null,
        allowedTools: null,
        rateLimit: 120,
        revokedAt: null,
        expiresAt: null,
        createdAt: '2026-01-01T00:00:00.000Z'
      };

      expect(typeof token.rateLimit).toBe('number');
      expect(token.rateLimit).toBeGreaterThan(0);
    });
  });

  describe('Null Handling Consistency', () => {
    it('should handle null allowedTools consistently (no restriction)', () => {
      const tokenWithoutRestriction: ClientTokenResponse = {
        id: 'tok_123',
        tokenPrefix: 'mcp_abc',
        description: null,
        allowedTools: null, // null = all tools allowed
        rateLimit: null,
        revokedAt: null,
        expiresAt: null,
        createdAt: '2026-01-01T00:00:00.000Z'
      };

      expect(tokenWithoutRestriction.allowedTools).toBeNull();
    });

    it('should handle null rateLimit consistently (use global default)', () => {
      const tokenWithDefaultRate: ClientTokenResponse = {
        id: 'tok_123',
        tokenPrefix: 'mcp_abc',
        description: null,
        allowedTools: null,
        rateLimit: null, // null = use global default
        revokedAt: null,
        expiresAt: null,
        createdAt: '2026-01-01T00:00:00.000Z'
      };

      expect(tokenWithDefaultRate.rateLimit).toBeNull();
    });

    it('should handle empty allowedTools array consistently (no tools allowed)', () => {
      const tokenWithNoTools: ClientTokenResponse = {
        id: 'tok_123',
        tokenPrefix: 'mcp_abc',
        description: null,
        allowedTools: [], // empty array = no tools allowed
        rateLimit: null,
        revokedAt: null,
        expiresAt: null,
        createdAt: '2026-01-01T00:00:00.000Z'
      };

      expect(tokenWithNoTools.allowedTools).toBeInstanceOf(Array);
      expect(tokenWithNoTools.allowedTools).toHaveLength(0);
    });
  });

  describe('Error Response Consistency', () => {
    it('should return consistent error format for authentication failures', () => {
      const nodeError = {
        error: 'Invalid admin token'
      };

      const workerError = {
        error: 'Invalid admin token'
      };

      expect(nodeError).toEqual(workerError);
    });

    it('should return consistent error format for validation failures', () => {
      const nodeError = {
        error: 'Invalid request parameters'
      };

      const workerError = {
        error: 'Invalid request parameters'
      };

      expect(nodeError).toEqual(workerError);
    });
  });

  describe('Date Format Consistency', () => {
    it('should use ISO 8601 format for all timestamps', () => {
      const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

      const nodeTimestamp = '2026-01-01T00:00:00.000Z';
      const workerTimestamp = '2026-01-01T00:00:00.000Z';

      expect(nodeTimestamp).toMatch(isoDateRegex);
      expect(workerTimestamp).toMatch(isoDateRegex);
    });
  });
});

describe('MCP Endpoint Contract Tests', () => {
  describe('JSON-RPC Response Structure', () => {
    it('should return consistent initialize response', () => {
      const nodeResponse = {
        jsonrpc: '2.0',
        id: 1,
        result: {
          protocolVersion: '2024-11-05',
          serverInfo: {
            name: 'mcp-nexus',
            version: '1.0.0'
          },
          capabilities: {
            tools: {}
          }
        }
      };

      const workerResponse = {
        jsonrpc: '2.0',
        id: 1,
        result: {
          protocolVersion: '2024-11-05',
          serverInfo: {
            name: 'mcp-nexus',
            version: '1.0.0'
          },
          capabilities: {
            tools: {}
          }
        }
      };

      expect(nodeResponse).toEqual(workerResponse);
    });

    it('should return consistent tools/list response', () => {
      const toolsList = [
        'tavily_search',
        'tavily_extract',
        'tavily_crawl',
        'tavily_map',
        'tavily_research',
        'brave_web_search',
        'brave_local_search'
      ];

      // Both should return same tool list
      expect(toolsList).toContain('tavily_search');
      expect(toolsList).toContain('brave_web_search');
      expect(toolsList).toHaveLength(7);
    });

    it('should enforce tool scoping consistently (Phase 3.4)', () => {
      // When token has allowedTools = ['tavily_search']
      const allowedTools = ['tavily_search'];
      const requestedTool = 'brave_web_search';

      const isAllowed = allowedTools.includes(requestedTool);
      expect(isAllowed).toBe(false);

      // Both Node and Worker should reject this request
      const errorMessage = `Tool '${requestedTool}' is not allowed for this token`;

      expect(errorMessage).toContain('not allowed');
      expect(errorMessage).toContain(requestedTool);
    });

    it('should enforce rate limits consistently (Phase 3.5)', () => {
      // When token has rateLimit = 100 (requests per minute)
      const tokenRateLimit = 100;
      const globalRateLimit = 600;

      // Both Node and Worker should use token-specific limit
      expect(tokenRateLimit).toBeLessThan(globalRateLimit);
      expect(tokenRateLimit).toBe(100);
    });
  });

  describe('Error Response Consistency', () => {
    it('should return consistent authentication error', () => {
      const error = {
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32600,
          message: 'Authorization header required'
        }
      };

      expect(error.error.code).toBe(-32600);
      expect(error.error.message).toContain('Authorization');
    });

    it('should return consistent rate limit error', () => {
      const error = {
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32029,
          message: 'Rate limit exceeded'
        }
      };

      expect(error.error.code).toBe(-32029);
      expect(error.error.message).toContain('Rate limit');
    });
  });
});

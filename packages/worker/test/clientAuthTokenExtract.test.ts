import { describe, it, expect } from 'vitest';

import { extractClientTokenFromRequest } from '../src/middleware/clientAuth.js';

describe('extractClientTokenFromRequest', () => {
  it('prefers Authorization header over query params', () => {
    const token = extractClientTokenFromRequest({
      authorizationHeader: 'Bearer header-token',
      queryTavilyApiKey: 'query-token',
      queryToken: 'query-token-alias',
      enableQueryAuth: true,
    });

    expect(token).toBe('header-token');
  });

  it('accepts Authorization header without Bearer prefix (backwards compatible)', () => {
    const token = extractClientTokenFromRequest({
      authorizationHeader: 'raw-token',
      queryTavilyApiKey: 'query-token',
      queryToken: undefined,
      enableQueryAuth: true,
    });

    expect(token).toBe('raw-token');
  });

  it('returns query token when enabled and Authorization header is missing', () => {
    const token = extractClientTokenFromRequest({
      authorizationHeader: undefined,
      queryTavilyApiKey: ' query-token ',
      queryToken: undefined,
      enableQueryAuth: true,
    });

    expect(token).toBe('query-token');
  });

  it('ignores non-bearer Authorization headers with whitespace and falls back to query token', () => {
    const token = extractClientTokenFromRequest({
      authorizationHeader: 'Basic abcdef',
      queryTavilyApiKey: 'query-token',
      queryToken: undefined,
      enableQueryAuth: true,
    });

    expect(token).toBe('query-token');
  });

  it('supports query token alias (?token=...)', () => {
    const token = extractClientTokenFromRequest({
      authorizationHeader: undefined,
      queryTavilyApiKey: undefined,
      queryToken: 'alias-token',
      enableQueryAuth: true,
    });

    expect(token).toBe('alias-token');
  });

  it('does not allow query token when disabled', () => {
    const token = extractClientTokenFromRequest({
      authorizationHeader: undefined,
      queryTavilyApiKey: 'query-token',
      queryToken: 'alias-token',
      enableQueryAuth: false,
    });

    expect(token).toBeUndefined();
  });
});

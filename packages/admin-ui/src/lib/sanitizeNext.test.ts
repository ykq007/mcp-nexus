import { describe, expect, it } from 'vitest';
import { sanitizeNext } from './sanitizeNext';
import { ROUTE_PATHS } from '../app/routePaths';

describe('sanitizeNext', () => {
  it('allows known in-app routes', () => {
    expect(sanitizeNext(ROUTE_PATHS.overview)).toBe(ROUTE_PATHS.overview);
    expect(sanitizeNext(ROUTE_PATHS.keys)).toBe(ROUTE_PATHS.keys);
    expect(sanitizeNext(ROUTE_PATHS.tokens)).toBe(ROUTE_PATHS.tokens);
    expect(sanitizeNext(ROUTE_PATHS.usage)).toBe(ROUTE_PATHS.usage);
    expect(sanitizeNext(ROUTE_PATHS.playground)).toBe(ROUTE_PATHS.playground);
    expect(sanitizeNext(ROUTE_PATHS.settings)).toBe(ROUTE_PATHS.settings);
  });

  it('preserves query strings for known routes', () => {
    expect(sanitizeNext('/keys?foo=bar')).toBe('/keys?foo=bar');
  });

  it('rejects unknown routes and login route', () => {
    expect(sanitizeNext('/unknown')).toBe('/');
    expect(sanitizeNext(ROUTE_PATHS.login)).toBe('/');
  });

  it('rejects open-redirect forms', () => {
    expect(sanitizeNext('https://evil.example')).toBe('/');
    expect(sanitizeNext('//evil.example')).toBe('/');
    expect(sanitizeNext('evil.example')).toBe('/');
  });
});


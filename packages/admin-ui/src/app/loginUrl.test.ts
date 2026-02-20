import { describe, expect, it } from 'vitest';
import { buildLandingLoginUrl } from './loginUrl';

describe('buildLandingLoginUrl', () => {
  it('builds landing modal URL with encoded next route', () => {
    expect(buildLandingLoginUrl('/keys?tab=active')).toBe('/?login=1&next=%2Fkeys%3Ftab%3Dactive');
  });

  it('falls back to root for unsafe next routes', () => {
    expect(buildLandingLoginUrl('https://evil.example')).toBe('/?login=1&next=%2F');
    expect(buildLandingLoginUrl('/login')).toBe('/?login=1&next=%2F');
  });
});

import { describe, expect, it } from 'vitest';
import {
  deriveTokenStatus,
  tokenStatusVariant,
  presetToSeconds,
  customDurationToSeconds,
  resolveExpiresInSeconds
} from './tokenStatus';

const NOW = new Date('2026-06-01T12:00:00Z');

describe('deriveTokenStatus', () => {
  it('returns revoked when revokedAt is set', () => {
    expect(deriveTokenStatus({ revokedAt: '2026-05-30T00:00:00Z', expiresAt: null }, NOW)).toBe('revoked');
  });

  it('prefers revoked over expired', () => {
    expect(
      deriveTokenStatus({ revokedAt: '2026-05-30T00:00:00Z', expiresAt: '2026-05-01T00:00:00Z' }, NOW)
    ).toBe('revoked');
  });

  it('returns expired when expiresAt is in the past', () => {
    expect(deriveTokenStatus({ revokedAt: null, expiresAt: '2026-05-01T00:00:00Z' }, NOW)).toBe('expired');
  });

  it('returns expiring when expiresAt is within 72 h', () => {
    const soon = new Date(NOW.getTime() + 48 * 3600 * 1000).toISOString();
    expect(deriveTokenStatus({ revokedAt: null, expiresAt: soon }, NOW)).toBe('expiring');
  });

  it('returns active when expiresAt is > 72 h away', () => {
    const later = new Date(NOW.getTime() + 96 * 3600 * 1000).toISOString();
    expect(deriveTokenStatus({ revokedAt: null, expiresAt: later }, NOW)).toBe('active');
  });

  it('returns active when no expiry', () => {
    expect(deriveTokenStatus({ revokedAt: null, expiresAt: null }, NOW)).toBe('active');
  });

  it('returns active for invalid expiresAt date', () => {
    expect(deriveTokenStatus({ revokedAt: null, expiresAt: 'not-a-date' }, NOW)).toBe('active');
  });

  it('returns expired when expiresAt is exactly now', () => {
    expect(deriveTokenStatus({ revokedAt: null, expiresAt: NOW.toISOString() }, NOW)).toBe('expired');
  });

  it('returns expiring when expiresAt is exactly 72 h away', () => {
    const boundary = new Date(NOW.getTime() + 72 * 3600 * 1000).toISOString();
    expect(deriveTokenStatus({ revokedAt: null, expiresAt: boundary }, NOW)).toBe('expiring');
  });

  it('returns active just past the 72 h boundary', () => {
    const justPast = new Date(NOW.getTime() + 72 * 3600 * 1000 + 1).toISOString();
    expect(deriveTokenStatus({ revokedAt: null, expiresAt: justPast }, NOW)).toBe('active');
  });

  it('prefers revoked over expiring', () => {
    const soon = new Date(NOW.getTime() + 24 * 3600 * 1000).toISOString();
    expect(deriveTokenStatus({ revokedAt: '2026-05-30T00:00:00Z', expiresAt: soon }, NOW)).toBe('revoked');
  });
});

describe('tokenStatusVariant', () => {
  it('maps active to success', () => expect(tokenStatusVariant('active')).toBe('success'));
  it('maps expiring to warning', () => expect(tokenStatusVariant('expiring')).toBe('warning'));
  it('maps expired to neutral', () => expect(tokenStatusVariant('expired')).toBe('neutral'));
  it('maps revoked to danger', () => expect(tokenStatusVariant('revoked')).toBe('danger'));
});

describe('presetToSeconds', () => {
  it('1h → 3600', () => expect(presetToSeconds('1h')).toBe(3600));
  it('24h → 86400', () => expect(presetToSeconds('24h')).toBe(86_400));
  it('7d → 604800', () => expect(presetToSeconds('7d')).toBe(7 * 86_400));
  it('30d → 2592000', () => expect(presetToSeconds('30d')).toBe(30 * 86_400));
  it('90d → 7776000', () => expect(presetToSeconds('90d')).toBe(90 * 86_400));
  it('never → undefined', () => expect(presetToSeconds('never')).toBeUndefined());
  it('custom → undefined', () => expect(presetToSeconds('custom')).toBeUndefined());
});

describe('customDurationToSeconds', () => {
  it('hours', () => expect(customDurationToSeconds(2, 'hours')).toBe(7200));
  it('days', () => expect(customDurationToSeconds(3, 'days')).toBe(259_200));
});

describe('resolveExpiresInSeconds', () => {
  it('never → undefined', () => expect(resolveExpiresInSeconds('never', 0, 'days')).toBeUndefined());
  it('1h preset', () => expect(resolveExpiresInSeconds('1h', 0, 'days')).toBe(3600));
  it('custom hours', () => expect(resolveExpiresInSeconds('custom', 5, 'hours')).toBe(18_000));
  it('custom days', () => expect(resolveExpiresInSeconds('custom', 2, 'days')).toBe(172_800));
  it('custom zero value → undefined', () => expect(resolveExpiresInSeconds('custom', 0, 'hours')).toBeUndefined());
  it('custom negative value → undefined', () => expect(resolveExpiresInSeconds('custom', -3, 'days')).toBeUndefined());
});

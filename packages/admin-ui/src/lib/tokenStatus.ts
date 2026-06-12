import type { ClientTokenDto } from './adminApi';

export type TokenStatus = 'active' | 'expiring' | 'expired' | 'revoked';

/** 72 hours in milliseconds — threshold for "Expires soon" warning */
const EXPIRING_THRESHOLD_MS = 72 * 60 * 60 * 1000;

/**
 * Derive the display status of a token.
 *
 * Priority:
 *  1. revokedAt set → 'revoked'
 *  2. expiresAt is in the past (before `now`) → 'expired'
 *  3. expiresAt is within 72 h from `now` → 'expiring'
 *  4. Otherwise → 'active'
 */
export function deriveTokenStatus(
  tok: Pick<ClientTokenDto, 'revokedAt' | 'expiresAt'>,
  now: Date = new Date()
): TokenStatus {
  if (tok.revokedAt) return 'revoked';
  if (tok.expiresAt) {
    const expiresMs = new Date(tok.expiresAt).getTime();
    if (Number.isNaN(expiresMs)) return 'active';
    const nowMs = now.getTime();
    if (expiresMs <= nowMs) return 'expired';
    if (expiresMs - nowMs <= EXPIRING_THRESHOLD_MS) return 'expiring';
  }
  return 'active';
}

/** Maps a status value to its badge data-variant */
export function tokenStatusVariant(
  status: TokenStatus
): 'success' | 'warning' | 'neutral' | 'danger' {
  switch (status) {
    case 'active':   return 'success';
    case 'expiring': return 'warning';
    case 'expired':  return 'neutral';
    case 'revoked':  return 'danger';
  }
}

// ---- Expiry preset helpers ------------------------------------------------

export type ExpiryPreset = 'never' | '1h' | '24h' | '7d' | '30d' | '90d' | 'custom';

/**
 * Convert a named preset to seconds.
 * Returns `undefined` for 'never' and 'custom' (caller handles those).
 */
export function presetToSeconds(preset: ExpiryPreset): number | undefined {
  switch (preset) {
    case '1h':  return 3600;
    case '24h': return 86_400;
    case '7d':  return 7 * 86_400;
    case '30d': return 30 * 86_400;
    case '90d': return 90 * 86_400;
    default:    return undefined;
  }
}

/** Convert a custom duration (value + unit) to seconds. */
export function customDurationToSeconds(
  value: number,
  unit: 'hours' | 'days'
): number {
  return unit === 'hours' ? value * 3600 : value * 86_400;
}

/**
 * Build the final expiresInSeconds for the API from the current preset/custom state.
 * Returns `undefined` when the token should never expire.
 */
export function resolveExpiresInSeconds(
  preset: ExpiryPreset,
  customValue: number,
  customUnit: 'hours' | 'days'
): number | undefined {
  if (preset === 'never') return undefined;
  if (preset === 'custom') {
    const secs = customDurationToSeconds(customValue, customUnit);
    return secs > 0 ? secs : undefined;
  }
  return presetToSeconds(preset);
}

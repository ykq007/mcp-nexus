/**
 * Redact sensitive query parameters that may contain secrets.
 *
 * This is primarily used to prevent accidental leakage when query-token auth
 * is enabled (e.g. `?tavilyApiKey=<client_token>`).
 */

const REDACTED = 'REDACTED';

export function redactSensitiveQueryParams(input: string): string {
  // Redact common token-carrying params.
  return input
    .replace(/([?&]tavilyApiKey=)[^&\s]*/g, `$1${REDACTED}`)
    .replace(/([?&]token=)[^&\s]*/g, `$1${REDACTED}`);
}


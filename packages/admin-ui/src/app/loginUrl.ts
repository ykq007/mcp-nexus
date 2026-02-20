import { sanitizeNext } from '../lib/sanitizeNext';

export function buildLandingLoginUrl(next: string | null | undefined): string {
  const safeNext = sanitizeNext(next);
  return `/?login=1&next=${encodeURIComponent(safeNext)}`;
}

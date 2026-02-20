import { ROUTE_PATHS } from './routePaths';
import { sanitizeNext } from '../lib/sanitizeNext';

export function buildLoginUrl(next: string | null | undefined): string {
  const safeNext = sanitizeNext(next);
  return `${ROUTE_PATHS.login}?next=${encodeURIComponent(safeNext)}`;
}


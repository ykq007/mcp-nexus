const ALLOWED_ADMIN_PATHS = new Set<string>(['/', '/keys', '/tokens', '/usage', '/playground', '/settings']);

export function sanitizeAdminNext(rawNext: string | null | undefined): string {
  if (!rawNext) return '/';
  if (!rawNext.startsWith('/')) return '/';
  if (rawNext.startsWith('//')) return '/';

  const questionIndex = rawNext.indexOf('?');
  const path = questionIndex === -1 ? rawNext : rawNext.slice(0, questionIndex);
  const query = questionIndex === -1 ? '' : rawNext.slice(questionIndex);

  if (!ALLOWED_ADMIN_PATHS.has(path)) return '/';

  return query ? `${path}${query}` : path;
}

export function buildAdminDashboardUrl(next: string | null | undefined): string {
  const safeNext = sanitizeAdminNext(next);
  return `/admin/#${safeNext}`;
}

export function shouldAutoOpenLoginModal(searchParams: URLSearchParams): boolean {
  const login = searchParams.get('login') ?? searchParams.get('adminLogin');
  if (searchParams.has('next')) return true;
  if (login == null) return false;
  if (login === '' || login === '1') return true;
  return login.toLowerCase() === 'true';
}

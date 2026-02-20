export const ROUTE_PATHS = {
  overview: '/',
  keys: '/keys',
  tokens: '/tokens',
  usage: '/usage',
  playground: '/playground',
  settings: '/settings',
  login: '/login'
} as const;

export type RoutePath = (typeof ROUTE_PATHS)[keyof typeof ROUTE_PATHS];

export const ALL_ROUTE_PATHS: RoutePath[] = Object.values(ROUTE_PATHS) as RoutePath[];

/**
 * Allow-list for safe in-app redirects after login.
 * Excludes the login route to avoid redirect loops.
 */
export const NEXT_ALLOWED_PATHS: RoutePath[] = ALL_ROUTE_PATHS.filter(
  (p) => p !== ROUTE_PATHS.login
);

export const NEXT_ALLOWED_PATHS_SET = new Set<string>(NEXT_ALLOWED_PATHS);


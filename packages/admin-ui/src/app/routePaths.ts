export const ROUTE_PATHS = {
  overview: '/',
  keys: '/keys',
  tokens: '/tokens',
  usage: '/usage',
  playground: '/playground',
  settings: '/settings'
} as const;

export type RoutePath = (typeof ROUTE_PATHS)[keyof typeof ROUTE_PATHS];

export const ALL_ROUTE_PATHS: RoutePath[] = Object.values(ROUTE_PATHS) as RoutePath[];

/** Allow-list for safe in-app redirects after landing-page sign-in. */
export const NEXT_ALLOWED_PATHS: RoutePath[] = ALL_ROUTE_PATHS;

export const NEXT_ALLOWED_PATHS_SET = new Set<string>(NEXT_ALLOWED_PATHS);

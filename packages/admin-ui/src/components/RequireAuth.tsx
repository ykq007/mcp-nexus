import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { buildLoginUrl } from '../app/loginUrl';

interface RequireAuthProps {
  adminToken: string;
}

/**
 * Route guard that redirects unauthenticated users to the login page.
 * Preserves the intended destination in the `next` query parameter.
 */
export function RequireAuth({ adminToken }: RequireAuthProps) {
  const location = useLocation();

  if (adminToken.trim()) {
    return <Outlet />;
  }

  const currentPath = `${location.pathname}${location.search}`;
  const loginUrl = buildLoginUrl(currentPath);

  return <Navigate to={loginUrl} replace />;
}

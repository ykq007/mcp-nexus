import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { buildLandingLoginUrl } from '../app/loginUrl';

interface RequireAuthProps {
  adminToken: string;
}

/**
 * Route guard that redirects unauthenticated users to the landing page login modal.
 * Preserves the intended destination in the `next` query parameter.
 */
export function RequireAuth({ adminToken }: RequireAuthProps) {
  const location = useLocation();
  const signedIn = Boolean(adminToken.trim());
  const currentPath = `${location.pathname}${location.search}`;

  useEffect(() => {
    if (signedIn) return;
    if (typeof window === 'undefined') return;
    window.location.replace(buildLandingLoginUrl(currentPath));
  }, [signedIn, currentPath]);

  if (!signedIn) {
    return null;
  }
  return <Outlet />;
}

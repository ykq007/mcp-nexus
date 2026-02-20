import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ShellLayout } from './app/Shell';
import { loadPrefs, savePrefs, type AdminUiPrefs } from './app/prefs';
import { clearAdminToken, loadAdminToken, persistAdminToken } from './app/adminAuth';
import { createAdminApi, normalizeBaseUrl } from './lib/adminApi';
import { sanitizeNext } from './lib/sanitizeNext';
import { RequireAuth } from './components/RequireAuth';
import { KeysPage } from './pages/KeysPage';
import { LoginPage } from './pages/LoginPage';
import { OverviewPage } from './pages/OverviewPage';
import { SettingsPage } from './pages/SettingsPage';
import { TokensPage } from './pages/TokensPage';
import { UsagePage } from './pages/UsagePage';
import { PlaygroundPage } from './pages/PlaygroundPage';
import { ToastProvider, useToast } from './ui/toast';
import type { AdminApi } from './lib/adminApi';
import { ROUTE_PATHS } from './app/routePaths';
import { buildLoginUrl } from './app/loginUrl';

function getDefaultApiBaseUrl(): string {
  const raw = import.meta.env.VITE_ADMIN_API_BASE;
  return typeof raw === 'string' ? normalizeBaseUrl(raw) : '';
}

export function App() {
  return (
    <ToastProvider>
      <HashRouter>
        <AppInner />
      </HashRouter>
    </ToastProvider>
  );
}

function AppInner() {
  const { t } = useTranslation('common');
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState<AdminUiPrefs>(() => loadPrefs({ apiBaseUrl: getDefaultApiBaseUrl() }));
  const [adminToken, setAdminToken] = useState(() => loadAdminToken());

  const currentPathRef = useRef(`${location.pathname}${location.search}`);
  useEffect(() => {
    currentPathRef.current = `${location.pathname}${location.search}`;
  }, [location.pathname, location.search]);

  useEffect(() => {
    document.documentElement.dataset.theme = prefs.theme;
  }, [prefs.theme]);

  useEffect(() => {
    savePrefs(prefs);
  }, [prefs]);

  useEffect(() => {
    persistAdminToken(adminToken, prefs.rememberAdminToken);
  }, [adminToken, prefs.rememberAdminToken]);

  const toggleTheme = useCallback(() => {
    setPrefs((prev) => ({ ...prev, theme: prev.theme === 'light' ? 'dark' : 'light' }));
  }, []);

  const toggleSidebar = useCallback(() => {
    setPrefs((prev) => ({ ...prev, sidebarCollapsed: !prev.sidebarCollapsed }));
  }, []);

  const signOut = useCallback(() => {
    setAdminToken('');
    clearAdminToken();
  }, []);

  const signOutAndRedirect = useCallback(
    (next?: string) => {
      signOut();
      navigate(buildLoginUrl(next ?? currentPathRef.current), { replace: true });
    },
    [signOut, navigate]
  );

  const onAuthFailure = useCallback(() => {
    signOut();
    navigate(buildLoginUrl(currentPathRef.current), { replace: true });
    toast.push({ title: t('auth.signedOut'), message: t('auth.authFailedMessage') });
  }, [signOut, toast, t, navigate]);

  // Best-effort: sync auth state across tabs when localStorage is used ("remember me").
  useEffect(() => {
    if (typeof window === 'undefined') return;
    function onStorage(e: StorageEvent) {
      if (!e.key) return;
      if (!e.key.startsWith('mcp-nexus.adminUiAdminToken.')) return;
      setAdminToken(loadAdminToken());
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const api = useMemo(
    () => createAdminApi({ baseUrl: prefs.apiBaseUrl, adminToken }, { onAuthFailure }),
    [prefs.apiBaseUrl, adminToken, onAuthFailure]
  );

  const connectionSummary = useMemo(() => {
    const base = prefs.apiBaseUrl.trim() ? prefs.apiBaseUrl.trim() : '(same origin)';
    const auth = adminToken.trim() ? 'signed in' : 'signed out';
    return `${base} • ${auth}`;
  }, [prefs.apiBaseUrl, adminToken]);

  const handleLogin = useCallback(
    (opts: { adminToken: string; remember: boolean }) => {
      setPrefs((prev) => ({ ...prev, rememberAdminToken: opts.remember }));
      setAdminToken(opts.adminToken);
    },
    []
  );

  return (
    <Routes>
      {/* Login page - standalone, no Shell */}
      <Route
        path={ROUTE_PATHS.login}
        element={
          <LoginPageWrapper
            apiBaseUrl={prefs.apiBaseUrl}
            defaultRemember={prefs.rememberAdminToken}
            onLogin={handleLogin}
            signedIn={Boolean(adminToken.trim())}
          />
        }
      />

      {/* Shell layout for all other pages */}
      <Route
        element={
          <ShellLayout
            connectionSummary={connectionSummary}
            theme={prefs.theme}
            onToggleTheme={toggleTheme}
            signedIn={Boolean(adminToken.trim())}
            onSignOut={() => signOutAndRedirect()}
            sidebarCollapsed={prefs.sidebarCollapsed}
            onToggleSidebar={toggleSidebar}
          />
        }
      >
        {/* Public: Settings */}
        <Route
          path={ROUTE_PATHS.settings}
          element={
            <SettingsPageWrapper
              api={api}
              prefs={prefs}
              setPrefs={setPrefs}
              signedIn={Boolean(adminToken.trim())}
              onSignOut={() => signOutAndRedirect()}
            />
          }
        />

        {/* Protected routes */}
        <Route element={<RequireAuth adminToken={adminToken} />}>
          <Route path={ROUTE_PATHS.overview} element={<OverviewPageWrapper api={api} />} />
          <Route path={ROUTE_PATHS.keys} element={<KeysPage api={api} />} />
          <Route path={ROUTE_PATHS.tokens} element={<TokensPage api={api} apiBaseUrl={prefs.apiBaseUrl} />} />
          <Route path={ROUTE_PATHS.usage} element={<UsagePage api={api} />} />
          <Route path={ROUTE_PATHS.playground} element={<PlaygroundPage apiBaseUrl={prefs.apiBaseUrl} />} />
        </Route>
      </Route>

      {/* Fallback: redirect to home */}
      <Route path="*" element={<Navigate to={ROUTE_PATHS.overview} replace />} />
    </Routes>
  );
}

/**
 * Wrapper for LoginPage that handles navigation after login
 */
function LoginPageWrapper({
  apiBaseUrl,
  defaultRemember,
  onLogin,
  signedIn
}: {
  apiBaseUrl: string;
  defaultRemember: boolean;
  onLogin: (opts: { adminToken: string; remember: boolean }) => void;
  signedIn: boolean;
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextParam = searchParams.get('next');
  const safeNext = sanitizeNext(nextParam);

  useEffect(() => {
    if (signedIn) {
      navigate(safeNext, { replace: true });
    }
  }, [signedIn, navigate, safeNext]);

  const handleLogin = useCallback(
    (opts: { adminToken: string; remember: boolean }) => {
      onLogin(opts);
      navigate(safeNext, { replace: true });
    },
    [onLogin, navigate, safeNext]
  );

  const handleGoToSettings = useCallback(() => {
    navigate(ROUTE_PATHS.settings);
  }, [navigate]);

  return (
    <div className="authFrame">
      <div className="authCenter">
        <LoginPage
          apiBaseUrl={apiBaseUrl}
          defaultRemember={defaultRemember}
          onLogin={handleLogin}
          onGoToSettings={handleGoToSettings}
        />
      </div>
    </div>
  );
}

/**
 * Wrapper for OverviewPage that provides navigation callbacks
 */
function OverviewPageWrapper({ api }: { api: AdminApi }) {
  const navigate = useNavigate();

  return (
    <OverviewPage
      api={api}
      onGoToKeys={() => navigate(ROUTE_PATHS.keys)}
      onGoToTokens={() => navigate(ROUTE_PATHS.tokens)}
      onGoToUsage={() => navigate(ROUTE_PATHS.usage)}
    />
  );
}

/**
 * Wrapper for SettingsPage that provides navigation callbacks
 */
function SettingsPageWrapper({
  api,
  prefs,
  setPrefs,
  signedIn,
  onSignOut
}: {
  api: AdminApi;
  prefs: AdminUiPrefs;
  setPrefs: React.Dispatch<React.SetStateAction<AdminUiPrefs>>;
  signedIn: boolean;
  onSignOut: () => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const currentPath = `${location.pathname}${location.search}`;

  const handleSignOut = useCallback(() => {
    onSignOut();
  }, [onSignOut]);

  const handleGoToLogin = useCallback(() => {
    navigate(buildLoginUrl(currentPath), { replace: false });
  }, [navigate, currentPath]);

  return (
    <SettingsPage
      api={api}
      value={{ apiBaseUrl: prefs.apiBaseUrl, theme: prefs.theme, locale: prefs.locale }}
      signedIn={signedIn}
      onChange={(next) => setPrefs((prev) => ({ ...prev, ...next }))}
      onGoToLogin={handleGoToLogin}
      onSignOut={handleSignOut}
    />
  );
}

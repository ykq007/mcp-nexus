import React from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  IconBeaker,
  IconChevronLeft,
  IconChevronRight,
  IconGrid,
  IconKey,
  IconMoon,
  IconSearch,
  IconSettings,
  IconShield,
  IconSun,
  IconToken,
} from '../ui/icons';
import { ROUTE_PATHS } from './routePaths';
import { buildLandingLoginUrl } from './loginUrl';
import '../styles/pages/shell.css';

interface NavItemDef {
  path: string;
  icon: React.ReactNode;
  labelKey: string;
  requiresAuth: boolean;
}

const navItems: NavItemDef[] = [
  { path: ROUTE_PATHS.overview, icon: <IconGrid />, labelKey: 'pages.overview', requiresAuth: true },
  { path: ROUTE_PATHS.keys, icon: <IconKey />, labelKey: 'pages.keys', requiresAuth: true },
  { path: ROUTE_PATHS.tokens, icon: <IconToken />, labelKey: 'pages.tokens', requiresAuth: true },
  { path: ROUTE_PATHS.usage, icon: <IconSearch />, labelKey: 'pages.usage', requiresAuth: true },
  { path: ROUTE_PATHS.playground, icon: <IconBeaker />, labelKey: 'pages.playground', requiresAuth: true },
  { path: ROUTE_PATHS.settings, icon: <IconSettings />, labelKey: 'pages.settings', requiresAuth: true },
];

const pageInfoKeys: Record<string, { titleKey: string; subtitleKey: string }> = {
  [ROUTE_PATHS.overview]:    { titleKey: 'pages.overview',    subtitleKey: 'pageSubtitles.overview' },
  [ROUTE_PATHS.keys]:        { titleKey: 'pages.keys',        subtitleKey: 'pageSubtitles.keys' },
  [ROUTE_PATHS.tokens]:      { titleKey: 'pages.tokens',      subtitleKey: 'pageSubtitles.tokens' },
  [ROUTE_PATHS.usage]:       { titleKey: 'pages.usage',       subtitleKey: 'pageSubtitles.usage' },
  [ROUTE_PATHS.playground]:  { titleKey: 'pages.playground',  subtitleKey: 'pageSubtitles.playground' },
  [ROUTE_PATHS.settings]:    { titleKey: 'pages.settings',    subtitleKey: 'pageSubtitles.settings' },
};

export function ShellLayout({
  connectionSummary,
  signedIn,
  onSignOut,
  sidebarCollapsed,
  onToggleSidebar,
  theme,
  onToggleTheme,
}: {
  connectionSummary: string;
  signedIn: boolean;
  onSignOut: () => void;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}) {
  const { t } = useTranslation('nav');
  const { t: tc } = useTranslation('common');
  const location = useLocation();

  const infoKeys = pageInfoKeys[location.pathname] ?? { titleKey: 'pages.overview', subtitleKey: '' };
  const title = t(infoKeys.titleKey);
  const subtitle = infoKeys.subtitleKey ? t(infoKeys.subtitleKey) : '';

  const currentPath = `${location.pathname}${location.search}`;
  const landingLoginUrlForCurrent = buildLandingLoginUrl(currentPath);

  const themeLabel =
    theme === 'dark' ? t('a11y.switchToLight') : t('a11y.switchToDark');

  return (
    <div className={`appFrame${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
      {/* Skip link — always the first focusable element */}
      <a className="skipLink" href="#mainContent">
        {t('a11y.skipToContent')}
      </a>

      <div className="appShell">
        {/* ── Desktop Sidebar ──────────────────────────────────────────── */}
        <aside className="sidebar" aria-label={t('sidebar.ariaLabel')}>
          {/* Brand header */}
          <div className="navHeader">
            <div className="navTitle">
              <IconShield title={t('brand')} />
              <div className="navTitleText">
                <div className="navBrand">{t('brand')}</div>
                <div className="navBrandSub">{t('subtitle')}</div>
              </div>
            </div>
          </div>

          {/* Nav items */}
          <nav className="nav" aria-label={t('a11y.mainNav')}>
            {navItems.map((item) => {
              const label = t(item.labelKey);
              const isActive = location.pathname === item.path;
              const signedOutHref = buildLandingLoginUrl(item.path);

              if (item.requiresAuth && !signedIn) {
                return (
                  <a
                    key={item.path}
                    href={signedOutHref}
                    className={`navItem${isActive ? ' navItem--active' : ''}`}
                    aria-current={isActive ? 'page' : undefined}
                    title={sidebarCollapsed ? label : undefined}
                    aria-label={sidebarCollapsed ? label : undefined}
                  >
                    <span className="navItemIcon" aria-hidden="true">{item.icon}</span>
                    <span className="navItemLabel">{label}</span>
                  </a>
                );
              }

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive: active }) =>
                    `navItem${active ? ' navItem--active' : ''}`
                  }
                  end={item.path === '/'}
                  title={sidebarCollapsed ? label : undefined}
                  aria-label={sidebarCollapsed ? label : undefined}
                >
                  <span className="navItemIcon" aria-hidden="true">{item.icon}</span>
                  <span className="navItemLabel">{label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Footer: collapse toggle + connection info */}
          <div className="navFooter">
            <button
              type="button"
              className="sidebarToggle"
              onClick={onToggleSidebar}
              aria-label={sidebarCollapsed ? t('sidebar.expandSidebar') : t('sidebar.collapseSidebar')}
              title={sidebarCollapsed ? t('sidebar.expand') : t('sidebar.collapse')}
            >
              {sidebarCollapsed ? <IconChevronRight /> : <IconChevronLeft />}
              <span className="sidebarToggleLabel">
                {sidebarCollapsed ? t('sidebar.expand') : t('sidebar.collapse')}
              </span>
            </button>

            <div className="navConnectionInfo">
              <div className="navConnectionLabel">{t('connection')}</div>
              <div
                className="navConnectionSummary"
                title={connectionSummary}
              >
                {connectionSummary}
              </div>
            </div>
          </div>
        </aside>

        {/* ── Main column ──────────────────────────────────────────────── */}
        <main className="mainPanel" id="mainContent" tabIndex={-1}>
          {/* Top bar */}
          <header className="appHeader">
            {/* Page title + subtitle */}
            <div className="topbarTitle">
              <h1 className="topbarPageTitle">{title}</h1>
              {subtitle && <p className="topbarPageSubtitle">{subtitle}</p>}
            </div>

            {/* Connection summary (desktop only) */}
            <div className="appHeaderMeta">
              <span className="headerConnectionLabel">{t('connection')}</span>
              <span className="headerConnection mono" title={connectionSummary}>
                {connectionSummary}
              </span>
            </div>

            <div className="appHeaderSep" aria-hidden="true" />

            {/* Theme toggle + sign-in/out */}
            <div className="appHeaderMeta">
              <button
                type="button"
                className="iconBtn"
                onClick={onToggleTheme}
                aria-label={themeLabel}
                title={themeLabel}
              >
                {theme === 'dark' ? <IconSun /> : <IconMoon />}
              </button>

              {signedIn ? (
                <button
                  type="button"
                  className="btn"
                  data-variant="ghost"
                  onClick={onSignOut}
                >
                  {tc('actions.signOut')}
                </button>
              ) : (
                <a
                  className="btn"
                  data-variant="primary"
                  href={landingLoginUrlForCurrent}
                >
                  {tc('actions.signIn')}
                </a>
              )}
            </div>
          </header>

          {/* Page content */}
          <div className="mainBody">
            <Outlet />
          </div>
        </main>
      </div>

      {/* ── Mobile Bottom Navigation ─────────────────────────────────── */}
      <nav className="mobileNav" aria-label={t('a11y.mobileNav')}>
        {navItems.map((item) => {
          const label = t(item.labelKey);
          const isActive = location.pathname === item.path;
          const signedOutHref = buildLandingLoginUrl(item.path);

          if (item.requiresAuth && !signedIn) {
            return (
              <a
                key={item.path}
                href={signedOutHref}
                className={`mobileNavItem${isActive ? ' mobileNavItem--active' : ''}`}
                aria-label={label}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.icon}
                <span>{label}</span>
              </a>
            );
          }

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive: active }) =>
                `mobileNavItem${active ? ' mobileNavItem--active' : ''}`
              }
              aria-label={label}
              end={item.path === '/'}
            >
              {item.icon}
              <span>{label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}

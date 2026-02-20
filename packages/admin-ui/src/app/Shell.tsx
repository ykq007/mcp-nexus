import React from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { BeakerIcon } from '@heroicons/react/24/outline';
import { IconChevronLeft, IconChevronRight, IconKey, IconMoon, IconSearch, IconSettings, IconShield, IconSun, IconToken } from '../ui/icons';
import type { Theme } from './prefs';
import { ROUTE_PATHS } from './routePaths';
import { buildLoginUrl } from './loginUrl';

export type PageId = 'overview' | 'keys' | 'tokens' | 'usage' | 'settings' | 'login' | 'playground';

interface NavItemDef {
  path: string;
  icon: React.ReactNode;
  labelKey: string;
  requiresAuth: boolean;
}

const navItems: NavItemDef[] = [
  { path: ROUTE_PATHS.overview, icon: <IconShield />, labelKey: 'pages.overview', requiresAuth: true },
  { path: ROUTE_PATHS.keys, icon: <IconKey />, labelKey: 'pages.keys', requiresAuth: true },
  { path: ROUTE_PATHS.tokens, icon: <IconToken />, labelKey: 'pages.tokens', requiresAuth: true },
  { path: ROUTE_PATHS.usage, icon: <IconSearch />, labelKey: 'pages.usage', requiresAuth: true },
  { path: ROUTE_PATHS.playground, icon: <BeakerIcon />, labelKey: 'pages.playground', requiresAuth: true },
  { path: ROUTE_PATHS.settings, icon: <IconSettings />, labelKey: 'pages.settings', requiresAuth: false }
];

const pageInfoKeys: Record<string, { titleKey: string; subtitleKey: string }> = {
  [ROUTE_PATHS.overview]: { titleKey: 'pages.overview', subtitleKey: 'pageSubtitles.overview' },
  [ROUTE_PATHS.keys]: { titleKey: 'pages.keys', subtitleKey: 'pageSubtitles.keys' },
  [ROUTE_PATHS.tokens]: { titleKey: 'pages.tokens', subtitleKey: 'pageSubtitles.tokens' },
  [ROUTE_PATHS.usage]: { titleKey: 'pages.usage', subtitleKey: 'pageSubtitles.usage' },
  [ROUTE_PATHS.playground]: { titleKey: 'pages.playground', subtitleKey: 'pageSubtitles.playground' },
  [ROUTE_PATHS.settings]: { titleKey: 'pages.settings', subtitleKey: 'pageSubtitles.settings' }
};

export function ShellLayout({
  connectionSummary,
  theme,
  onToggleTheme,
  signedIn,
  onSignOut,
  sidebarCollapsed,
  onToggleSidebar
}: {
  connectionSummary: string;
  theme: Theme;
  onToggleTheme: () => void;
  signedIn: boolean;
  onSignOut: () => void;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}) {
  const { t } = useTranslation('nav');
  const { t: tc } = useTranslation('common');
  const location = useLocation();
  const infoKeys = pageInfoKeys[location.pathname] || { titleKey: 'pages.overview', subtitleKey: '' };
  const title = t(infoKeys.titleKey);
  const subtitle = infoKeys.subtitleKey ? t(infoKeys.subtitleKey) : '';

  const currentPath = `${location.pathname}${location.search}`;
  const loginUrlForCurrent = buildLoginUrl(currentPath);

  const themeModeLabel = theme === 'light' ? t('theme.dark') : t('theme.light');
  const themeSwitchLabel = t('theme.switchTo', { mode: theme === 'light' ? t('theme.dark') : t('theme.light') });

  return (
    <div className={`appFrame${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
      <a className="skipLink" href="#mainContent">
        {t('a11y.skipToContent')}
      </a>
      <div className="appShell">
        {/* Desktop Sidebar */}
        <aside className="sidebar">
          <div className="navHeader">
            <div className="navTitle">
              <IconShield title="Admin" />
              <div className="navTitleText">
                <div className="navBrand">{t('brand')}</div>
                <div className="help">{t('subtitle')}</div>
              </div>
            </div>
          </div>
          <nav className="nav" aria-label="Admin navigation">
            {navItems.map((item) => {
              const label = t(item.labelKey);
              const to = !item.requiresAuth || signedIn ? item.path : buildLoginUrl(item.path);
              return (
                <NavLink
                  key={item.path}
                  to={to}
                  className={({ isActive }) => `navItem${isActive ? ' navItem--active' : ''}`}
                  data-active={location.pathname === item.path}
                  end={item.path === '/'}
                  title={sidebarCollapsed ? label : undefined}
                >
                  <span className="navItemIcon">{item.icon}</span>
                  <span className="navItemLabel">{label}</span>
                </NavLink>
              );
            })}
          </nav>
          <div className="navFooter">
            <button className="themeToggle" onClick={onToggleTheme} aria-label={themeSwitchLabel} title={sidebarCollapsed ? themeModeLabel : undefined}>
              {theme === 'light' ? <IconMoon /> : <IconSun />}
              <span>{themeModeLabel}</span>
            </button>
            <button className="sidebarToggle" onClick={onToggleSidebar} aria-label={sidebarCollapsed ? t('sidebar.expandSidebar') : t('sidebar.collapseSidebar')} title={sidebarCollapsed ? t('sidebar.expand') : t('sidebar.collapse')}>
              {sidebarCollapsed ? <IconChevronRight /> : <IconChevronLeft />}
              <span>{sidebarCollapsed ? t('sidebar.expand') : t('sidebar.collapse')}</span>
            </button>
            <div className="navConnectionInfo">
              <div className="help">{t('connection')}</div>
              <div className="mono navConnectionSummary">
                {connectionSummary}
              </div>
            </div>
          </div>
        </aside>

        <main className="mainPanel" id="mainContent" tabIndex={-1}>
          <header className="appHeader">
            <div className="topbarTitle">
              <div className="h1">{title}</div>
              <div className="help">{subtitle}</div>
            </div>
            <div className="appHeaderMeta">
              <span className="help">{t('connection')}</span>
              <span className="headerConnection mono" title={connectionSummary}>
                {connectionSummary}
              </span>
            </div>
            <div className="appHeaderMeta">
              {signedIn ? (
                <button className="btn" data-variant="ghost" onClick={onSignOut}>
                  {tc('actions.signOut')}
                </button>
              ) : (
                <NavLink className="btn" data-variant="primary" to={loginUrlForCurrent}>
                  {tc('actions.signIn')}
                </NavLink>
              )}
            </div>
          </header>
          <div className="mainBody">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="mobileNav" aria-label="Mobile navigation">
        {navItems.map((item) => {
          const label = t(item.labelKey);
          const to = !item.requiresAuth || signedIn ? item.path : buildLoginUrl(item.path);
          return (
            <NavLink
              key={item.path}
              to={to}
              className="mobileNavItem"
              data-active={location.pathname === item.path}
              aria-label={label}
              aria-current={location.pathname === item.path ? 'page' : undefined}
              end={item.path === '/'}
            >
              {item.icon}
              <span>{label}</span>
            </NavLink>
          );
        })}
        <button
          className="mobileNavItem"
          onClick={onToggleTheme}
          aria-label={themeSwitchLabel}
        >
          {theme === 'light' ? <IconMoon /> : <IconSun />}
          <span>{t('theme.toggle')}</span>
        </button>
      </nav>
    </div>
  );
}

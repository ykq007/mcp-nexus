import { useEffect, useId, useRef, useState } from 'react';

const NAV_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '/health', label: 'Health' },
  {
    href: 'https://github.com/anthropics/mcp-nexus',
    label: 'GitHub',
    external: true
  }
];

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

// ── Theme toggle helpers ─────────────────────────────────────────────────────
function getTheme(): 'light' | 'dark' {
  try {
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') return stored;
  } catch { /* ignore */ }
  return 'light';
}

function applyTheme(theme: 'light' | 'dark') {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('theme', theme); } catch { /* ignore */ }
}

// ── Sun icon ─────────────────────────────────────────────────────────────────
function SunIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 2v1M8 13v1M2 8h1M13 8h1M3.7 3.7l.7.7M11.6 11.6l.7.7M3.7 12.3l.7-.7M11.6 4.4l.7-.7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── Moon icon ─────────────────────────────────────────────────────────────────
function MoonIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M12 10A5 5 0 0 1 6 4a5 5 0 0 0 6 6Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Logo ──────────────────────────────────────────────────────────────────────
function BrandLogo() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
      />
    </svg>
  );
}

// ── Navbar ────────────────────────────────────────────────────────────────────
export function Navbar({ onOpenDashboard }: { onOpenDashboard: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(getTheme);

  const mobileMenuId = useId();
  const mobileTitleId = useId();
  const menuBtnRef = useRef<HTMLButtonElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  // ── Close on viewport resize ─────────────────────────────────────────────
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 720) setMenuOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── Mobile menu focus trap + scroll lock ─────────────────────────────────
  useEffect(() => {
    if (!menuOpen) return;

    prevFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const prevOverflow = document.body.style.overflow;
    const prevPad = document.body.style.paddingRight;
    const sb = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (sb > 0) document.body.style.paddingRight = `${sb}px`;

    closeBtnRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setMenuOpen(false);
        return;
      }
      if (e.key !== 'Tab') return;
      const menu = mobileMenuRef.current;
      if (!menu) return;
      const focusable = Array.from(
        menu.querySelectorAll<HTMLElement>(FOCUSABLE)
      ).filter((el) => !(el as HTMLInputElement).disabled);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (!active || !menu.contains(active)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
        return;
      }
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPad;
      (prevFocusRef.current ?? menuBtnRef.current)?.focus();
    };
  }, [menuOpen]);

  // ── Theme toggle ─────────────────────────────────────────────────────────
  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    applyTheme(next);
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <nav className="navbar" aria-label="Primary navigation">
        <div className="l-container navbar__inner">
          {/* Brand */}
          <a href="/" className="navbar__brand" aria-label="MCP Nexus home">
            <span className="navbar__logo">
              <BrandLogo />
            </span>
            <span className="navbar__brand-name">MCP Nexus</span>
          </a>

          {/* Desktop nav links */}
          <div className="navbar__links">
            {NAV_LINKS.map((link) =>
              link.external ? (
                <a
                  key={link.label}
                  href={link.href}
                  className="navbar__link"
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${link.label} (opens in a new tab)`}
                >
                  {link.label}
                </a>
              ) : (
                <a key={link.label} href={link.href} className="navbar__link">
                  {link.label}
                </a>
              )
            )}
          </div>

          {/* Desktop actions */}
          <div className="navbar__actions">
            <button
              type="button"
              className="navbar__theme-btn"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            >
              {theme === 'light' ? <MoonIcon /> : <SunIcon />}
            </button>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={onOpenDashboard}
            >
              Open Dashboard
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            ref={menuBtnRef}
            type="button"
            className="navbar__menu-btn"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            aria-controls={mobileMenuId}
            aria-haspopup="dialog"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <svg viewBox="0 0 18 18" fill="none" aria-hidden="true">
              {menuOpen ? (
                <path
                  d="M3 3l12 12M15 3L3 15"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              ) : (
                <>
                  <path d="M2 4.5h14M2 9h14M2 13.5h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </>
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile side panel */}
      {menuOpen && (
        <div
          className="navbar__mobile-overlay"
          role="presentation"
          onClick={closeMenu}
        >
          <div
            id={mobileMenuId}
            ref={mobileMenuRef}
            className="navbar__mobile-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={mobileTitleId}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="navbar__mobile-header">
              <span id={mobileTitleId} className="navbar__mobile-title">
                Navigation
              </span>
              <button
                ref={closeBtnRef}
                type="button"
                className="btn btn--sm"
                onClick={closeMenu}
                aria-label="Close navigation menu"
              >
                Close
              </button>
            </div>

            <div className="navbar__mobile-links">
              {NAV_LINKS.map((link) =>
                link.external ? (
                  <a
                    key={link.label}
                    href={link.href}
                    className="navbar__mobile-link"
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`${link.label} (opens in a new tab)`}
                    onClick={closeMenu}
                  >
                    {link.label}
                  </a>
                ) : (
                  <a
                    key={link.label}
                    href={link.href}
                    className="navbar__mobile-link"
                    onClick={closeMenu}
                  >
                    {link.label}
                  </a>
                )
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: 'auto' }}>
              <button
                type="button"
                className="navbar__theme-btn"
                onClick={() => { toggleTheme(); closeMenu(); }}
                aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
              >
                {theme === 'light' ? <MoonIcon /> : <SunIcon />}
              </button>
              <button
                type="button"
                className="btn btn--primary navbar__mobile-cta"
                onClick={() => { closeMenu(); onOpenDashboard(); }}
                style={{ flex: 1 }}
              >
                Open Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

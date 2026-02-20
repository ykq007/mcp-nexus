const navLinks = [
  { href: '#features', label: 'Features' },
  { href: '/health', label: 'Health' },
  { href: 'https://github.com/anthropics/mcp-nexus', label: 'GitHub', external: true },
];

export function Navbar() {
  return (
    <nav className="navbar" aria-label="Primary navigation">
      <div className="landing-shell navbar__container">
        <a href="/" className="navbar__brand">
          <span className="navbar__logo-wrap" aria-hidden="true">
            <svg className="navbar__logo" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
          </span>
          <span className="navbar__brand-text">MCP Nexus</span>
        </a>

        <div className="navbar__links">
          {navLinks.map((link) => (
            link.external ? (
              <a key={link.label} href={link.href} className="navbar__link" target="_blank" rel="noreferrer">
                {link.label}
              </a>
            ) : (
              <a key={link.label} href={link.href} className="navbar__link">
                {link.label}
              </a>
            )
          ))}
        </div>

        <div className="navbar__actions">
          <span className="navbar__status">Realtime telemetry</span>
          <a href="/admin" className="btn btn--primary">
            Open Dashboard
          </a>
        </div>
      </div>
    </nav>
  );
}

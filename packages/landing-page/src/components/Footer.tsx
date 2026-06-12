export function Footer({ onOpenDashboard }: { onOpenDashboard: () => void }) {
  const year = new Date().getFullYear();

  return (
    <footer className="footer" aria-label="Site footer">
      <div className="l-container">
        <div className="footer__inner">
          {/* Brand */}
          <div className="footer__brand">
            <p className="footer__brand-name">MCP Nexus</p>
            <p className="footer__brand-desc">
              A self-hosted MCP search gateway for teams running Tavily and Brave
              in production — with key management, client auth, and observability
              built in.
            </p>
          </div>

          {/* Navigation groups */}
          <nav className="footer__nav" aria-label="Footer navigation">
            <div className="footer__nav-group">
              <p className="footer__nav-heading">Console</p>
              <button
                type="button"
                className="footer__nav-btn"
                onClick={onOpenDashboard}
              >
                Admin Dashboard
              </button>
              <a href="/health" className="footer__nav-link">
                Health Status
              </a>
            </div>

            <div className="footer__nav-group">
              <p className="footer__nav-heading">Resources</p>
              <a
                href="https://github.com/anthropics/mcp-nexus"
                className="footer__nav-link"
                target="_blank"
                rel="noreferrer"
                aria-label="GitHub (opens in a new tab)"
              >
                GitHub
              </a>
              <a href="#features" className="footer__nav-link">
                Features
              </a>
            </div>
          </nav>
        </div>

        <div className="footer__bottom">
          <p className="footer__copy">
            © {year} MCP Nexus. Built for teams operating multi-provider MCP
            search workloads.
          </p>
        </div>
      </div>
    </footer>
  );
}

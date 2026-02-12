import React from 'react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer__container">
        <p className="footer__text">
          © {currentYear} MCP Nexus. Multi-provider search bridge.
        </p>
        <ul className="footer__links">
          <li>
            <a href="https://github.com/anthropics/mcp-nexus" className="footer__link">
              GitHub
            </a>
          </li>
          <li>
            <a href="/health" className="footer__link">
              Health Status
            </a>
          </li>
          <li>
            <a href="/admin" className="footer__link">
              Admin Dashboard
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
}

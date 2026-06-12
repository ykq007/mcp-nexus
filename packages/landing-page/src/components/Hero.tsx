const proofPoints = [
  'Self-hosted on Cloudflare Workers + D1',
  'Round-robin / random key selection with cooldown recovery',
  'Client token scoping, expiry, and rate limits'
];

const panelRows = [
  {
    icon: (
      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="hero__panel-row-icon">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5.5 8l2 2 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    label: 'Tavily pool',
    value: <span className="hero__panel-badge hero__panel-badge--active">3 active</span>
  },
  {
    icon: (
      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="hero__panel-row-icon">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5.5 8l2 2 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    label: 'Brave pool',
    value: <span className="hero__panel-badge hero__panel-badge--active">2 active</span>
  },
  {
    icon: (
      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="hero__panel-row-icon">
        <path d="M8 2v4l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
    label: 'Client tokens',
    value: <span className="hero__panel-badge hero__panel-badge--active">12 active</span>
  },
  {
    icon: (
      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="hero__panel-row-icon">
        <path d="M2 8h12M8 2l4 6-4 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    label: 'Tavily credits',
    value: <span className="hero__panel-badge hero__panel-badge--warn">4 820 / 5 000</span>
  },
  {
    icon: (
      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="hero__panel-row-icon">
        <path d="M8 2l1.8 3.6 4 .6-2.9 2.8.7 4L8 11l-3.6 1.9.7-4L2.2 6.2l4-.6L8 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    label: 'Requests / min',
    value: <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--ink)' }}>47</span>
  }
];

export function Hero({ onOpenDashboard }: { onOpenDashboard: () => void }) {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="l-container hero__container">
        {/* Left: value proposition */}
        <div className="hero__content">
          <h1 className="hero__title" id="hero-title">
            One{' '}
            <span className="hero__copper">resilient gateway</span>{' '}
            for multi-provider search.
          </h1>

          <p className="hero__subtitle">
            MCP Nexus routes Tavily and Brave traffic through a single MCP endpoint
            — with credit-aware key rotation, scoped client tokens, and a full
            admin console for production operations.
          </p>

          <div className="hero__cta">
            <button
              type="button"
              className="btn btn--primary btn--lg"
              onClick={onOpenDashboard}
            >
              Open Admin Console
            </button>
            <a
              href="https://github.com/anthropics/mcp-nexus"
              className="btn btn--lg"
              target="_blank"
              rel="noreferrer"
              aria-label="View source on GitHub (opens in a new tab)"
            >
              <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
              </svg>
              GitHub
            </a>
          </div>

          <ul className="hero__proof" aria-label="Platform highlights">
            {proofPoints.map((point) => (
              <li key={point} className="hero__proof-item">
                <span className="hero__proof-dot" aria-hidden="true" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        {/* Right: live-status instrument panel */}
        <aside className="hero__panel" aria-label="Admin console status preview">
          <div className="hero__panel-header">
            <span className="hero__panel-title">Admin Console</span>
            <span className="hero__panel-status">All systems operational</span>
          </div>
          <ul className="hero__panel-rows">
            {panelRows.map((row, i) => (
              <li key={i} className="hero__panel-row">
                <span className="hero__panel-row-label">
                  {row.icon}
                  {row.label}
                </span>
                <span className="hero__panel-row-value">{row.value}</span>
              </li>
            ))}
          </ul>
          <div className="hero__panel-footer">
            <a href="/health" className="hero__panel-cta">
              Health endpoint →
            </a>
          </div>
        </aside>
      </div>
    </section>
  );
}

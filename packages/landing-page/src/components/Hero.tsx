const proofPoints = [
  'Self-hosted on Cloudflare Workers + D1',
  'Tavily + Brave behind one MCP endpoint',
  'Client tokens, key rotation, and request visibility'
];

const clientNodes = ['Claude / MCP', 'Codex / MCP', 'Custom client'];

const providerNodes = [
  { name: 'Tavily', meta: 'key pool · credits' },
  { name: 'Brave', meta: 'key pool · rate state' }
];

export function Hero({ onOpenDashboard }: { onOpenDashboard: () => void }) {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="l-container hero__container">
        <div className="hero__content">
          <h1 className="hero__title" id="hero-title">
            One MCP search endpoint.<br />
            Multiple upstreams.<br />
            <span>One control plane.</span>
          </h1>

          <p className="hero__subtitle">
            Route Tavily and Brave through one self-hosted MCP gateway. Manage
            upstream keys, mint scoped client tokens, inspect usage, and test the
            full path without leaving the console.
          </p>

          <div className="hero__cta">
            <button
              type="button"
              className="btn btn--primary btn--lg"
              onClick={onOpenDashboard}
            >
              Sign in to console
            </button>
            <a
              href="https://github.com/ykq007/mcp-nexus"
              className="btn btn--lg"
              target="_blank"
              rel="noreferrer"
              aria-label="View source on GitHub (opens in a new tab)"
            >
              View source
            </a>
          </div>

          <ul className="hero__proof" aria-label="Platform highlights">
            {proofPoints.map((point) => (
              <li key={point} className="hero__proof-item">
                <span className="hero__proof-mark" aria-hidden="true" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <aside className="route-board" aria-label="mcp-nexus routing model">
          <div className="route-board__head">
            <div>
              <div className="route-board__title">Live route</div>
              <div className="route-board__sub">Illustrative control-plane state</div>
            </div>
            <span className="route-board__status">
              <span className="route-board__status-dot" aria-hidden="true" />
              ready
            </span>
          </div>

          <div className="route-board__flow">
            <div className="route-stage route-stage--clients">
              <div className="route-stage__label">MCP clients</div>
              <div className="route-stage__stack">
                {clientNodes.map((name) => (
                  <div className="route-node route-node--client" key={name}>
                    <span className="route-node__signal" aria-hidden="true" />
                    <span>{name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="route-link" aria-hidden="true">
              <span />
            </div>

            <div className="route-core">
              <div className="route-core__brand">mcp / nexus</div>
              <div className="route-core__endpoint mono">POST /mcp</div>
              <dl className="route-core__ledger">
                <div>
                  <dt>client auth</dt>
                  <dd>scoped</dd>
                </div>
                <div>
                  <dt>routing</dt>
                  <dd>combined</dd>
                </div>
                <div>
                  <dt>key state</dt>
                  <dd>healthy</dd>
                </div>
              </dl>
            </div>

            <div className="route-link route-link--out" aria-hidden="true">
              <span />
            </div>

            <div className="route-stage route-stage--providers">
              <div className="route-stage__label">Upstreams</div>
              <div className="route-stage__stack">
                {providerNodes.map((provider) => (
                  <div className="route-node route-node--provider" key={provider.name}>
                    <span className="route-node__provider-name">{provider.name}</span>
                    <span className="route-node__meta">{provider.meta}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="route-board__foot">
            <div>
              <span>active upstream keys</span>
              <strong className="mono">5</strong>
            </div>
            <div>
              <span>client tokens</span>
              <strong className="mono">12</strong>
            </div>
            <div>
              <span>route mode</span>
              <strong className="mono">auto</strong>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

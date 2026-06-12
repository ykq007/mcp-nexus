/* Features section — "Graphite & Cobalt" redesign.
 *
 * Layout: NOT a uniform 4-up icon-heading-text card grid.
 * Structure:
 *   Row 1 (full width): Key management — the flagship feature, wider treatment
 *   Row 2 (split): Client tokens (left) | Usage observability (right)
 *   Row 3 (full width): Deployment — self-hosted, low-friction
 *
 * Each cell uses a slightly different compositional rhythm to break the
 * template feel: some lead with a large tag cluster, one with a code excerpt,
 * one with a capability list with explanatory micro-text.
 */

function KeyIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M7 10.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM10.121 9.38l1.415 1.414-1.415 1.415L11.535 13.6l-1.414 1.414L8.707 13.6 7 15.306"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 7a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1Z"
        fill="currentColor"
      />
    </svg>
  );
}

function TokenIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 8.5h14" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 12h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 14l3.5-3.5 3 2 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 4v12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CloudIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M5.5 14a3 3 0 0 1-.5-5.95 4.5 4.5 0 0 1 8.66-1.1A3 3 0 0 1 14.5 14H5.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Features() {
  return (
    <section className="features" id="features" aria-labelledby="features-title">
      <div className="l-container">
        <header className="features__header">
          <h2 className="features__title" id="features-title">
            The complete operator surface for search infrastructure.
          </h2>
          <p className="features__subtitle">
            From upstream key rotation to client token lifecycle to usage cost
            tracking — everything an operator needs, built for precision and speed.
          </p>
        </header>

        {/* Varied layout grid — NOT identical card grid */}
        <div className="features__layout" role="list">

          {/* Feature 1: Key management — full-width hero cell with horizontal layout */}
          <article className="feature-cell feature-cell--wide" role="listitem">
            <div className="feature-cell__icon">
              <KeyIcon />
            </div>
            <div className="feature-cell__body">
              <h3 className="feature-cell__title">Multi-provider key management</h3>
              <p className="feature-cell__desc">
                Manage Tavily and Brave API keys from a single pool. Round-robin or
                random selection, automatic cooldown recovery, credit tracking, and
                bulk import/export — so you never hit a wall mid-operation.
              </p>
              <div className="feature-cell__tags" role="list" aria-label="Capability tags">
                <span className="feature-tag" role="listitem">tvly-key rotation</span>
                <span className="feature-tag" role="listitem">credit-aware routing</span>
                <span className="feature-tag" role="listitem">cooldown recovery</span>
                <span className="feature-tag" role="listitem">bulk import / export</span>
                <span className="feature-tag" role="listitem">status: active / disabled / invalid</span>
              </div>
            </div>
          </article>

          {/* Feature 2: Client tokens — left cell, list-driven */}
          <article className="feature-cell" role="listitem">
            <div className="feature-cell__icon">
              <TokenIcon />
            </div>
            <h3 className="feature-cell__title">Scoped client tokens</h3>
            <p className="feature-cell__desc">
              Issue tokens to MCP clients with fine-grained control.
              Each token carries its own scope, expiry, and rate limit —
              so a compromised client never takes down the whole pool.
            </p>
            <ul className="feature-cell__list" aria-label="Token capabilities">
              <li>Expiry: never / 1 h / 24 h / 7 d / 30 d / 90 d / custom</li>
              <li>Tool allowlist: all or restrict to Tavily / Brave subsets</li>
              <li>Rate limit per token (req/min), revealed once and auto-cleared</li>
              <li>Soft revoke or hard delete; setup snippet per MCP target</li>
            </ul>
          </article>

          {/* Feature 3: Usage observability — right cell, metrics angle */}
          <article className="feature-cell" role="listitem">
            <div className="feature-cell__icon">
              <ChartIcon />
            </div>
            <h3 className="feature-cell__title">Usage and cost observability</h3>
            <p className="feature-cell__desc">
              Full audit log of every request: tool, outcome, latency, client
              token, and upstream key. Filter by any dimension; inspect args and
              error detail inline. Tavily credit consumption and Brave cost
              estimates surface in the dashboard.
            </p>
            <ul className="feature-cell__list" aria-label="Observability capabilities">
              <li>Live metrics: req/min, req/hr, active tokens, pool health</li>
              <li>Per-request query preview, latency, and error message</li>
              <li>Tavily credit + Brave USD cost estimate by period</li>
            </ul>
          </article>

          {/* Feature 4: Deployment — full-width bottom cell, compact */}
          <article className="feature-cell feature-cell--wide" role="listitem">
            <div className="feature-cell__icon">
              <CloudIcon />
            </div>
            <div className="feature-cell__body">
              <h3 className="feature-cell__title">Self-hosted on Cloudflare Workers</h3>
              <p className="feature-cell__desc">
                Deploy on your own Workers account. A single worker handles the MCP
                endpoint, key routing, token validation, and the admin API — with
                D1 for persistence. No third-party backend, no shared infrastructure,
                no surprise billing.
              </p>
              <div className="feature-cell__tags" role="list" aria-label="Deployment stack">
                <span className="feature-tag" role="listitem">Cloudflare Workers</span>
                <span className="feature-tag" role="listitem">D1 SQLite</span>
                <span className="feature-tag" role="listitem">MCP JSON-RPC 2.0</span>
                <span className="feature-tag" role="listitem">stdio + HTTP transport</span>
                <span className="feature-tag" role="listitem">/health endpoint</span>
              </div>
            </div>
          </article>

        </div>
      </div>
    </section>
  );
}

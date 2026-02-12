import React from 'react';

export function Hero() {
  return (
    <section className="hero">
      <div className="hero__container">
        <h1 className="hero__title">
          Multi-Provider Search Bridge
        </h1>
        <p className="hero__subtitle">
          Unified interface to Tavily and Brave Search APIs with intelligent key rotation,
          comprehensive monitoring, and a modern admin dashboard.
        </p>
        <div className="hero__cta">
          <a href="/admin" className="btn btn--primary">
            Get Started
          </a>
          <a href="https://github.com/anthropics/mcp-nexus" className="btn btn--secondary">
            View on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}

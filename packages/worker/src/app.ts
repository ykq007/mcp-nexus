import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import type { Env } from './env.js';
import { adminRouter } from './routes/admin/index.js';
import { handleMcpRequest } from './mcp/mcpHandler.js';

// Create the main Hono app
const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use('*', logger());

// CORS for Admin UI (adjust origin in production)
app.use('/admin/api/*', cors({
  origin: (origin) => {
    // Allow localhost in dev, specific Pages domain in production
    if (!origin) return '*';
    if (origin.includes('localhost')) return origin;
    if (origin.includes('.pages.dev')) return origin;
    return null;
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    version: '1.0.0',
    runtime: 'cloudflare-workers',
    timestamp: new Date().toISOString(),
  });
});

// MCP endpoint - handle JSON-RPC requests directly
app.post('/mcp', async (c) => {
  return handleMcpRequest(c);
});

// MCP GET endpoint - server info
app.get('/mcp', (c) => {
  return c.json({
    name: 'mcp-nexus',
    version: '1.0.0',
    transport: ['http', 'sse'],
  });
});

// MCP SSE endpoint - forwards to Durable Object for session management
app.get('/mcp/sse', async (c) => {
  const authHeader = c.req.header('Authorization');
  const sessionId = authHeader
    ? authHeader.replace('Bearer ', '').substring(0, 16)
    : 'anonymous';

  const id = c.env.MCP_SESSION.idFromName(sessionId);
  const stub = c.env.MCP_SESSION.get(id);

  const url = new URL(c.req.url);
  url.pathname = '/sse';

  return stub.fetch(new Request(url.toString(), {
    method: 'GET',
    headers: c.req.raw.headers,
  }));
});

// Landing page
app.get('/', (c) => {
  const baseUrl = new URL(c.req.url).origin;
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MCP Nexus - Tavily Bridge</title>
  <style>
    :root { --bg: #0f172a; --fg: #e2e8f0; --accent: #3b82f6; }
    @media (prefers-color-scheme: light) { :root { --bg: #f8fafc; --fg: #1e293b; } }
    body { font-family: system-ui, sans-serif; background: var(--bg); color: var(--fg); max-width: 800px; margin: 0 auto; padding: 2rem; }
    h1 { color: var(--accent); }
    a { color: var(--accent); }
    pre { background: #1e293b; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; }
    code { font-family: 'Fira Code', monospace; }
  </style>
</head>
<body>
  <h1>MCP Nexus</h1>
  <p>A unified MCP bridge server for Tavily and Brave Search APIs.</p>

  <h2>Endpoints</h2>
  <ul>
    <li><strong>MCP:</strong> <code>/mcp</code> (SSE transport)</li>
    <li><strong>Admin UI:</strong> <a href="/admin">/admin</a></li>
    <li><strong>Health:</strong> <a href="/health">/health</a></li>
  </ul>

  <h2>Connect with MCP Client</h2>
  <pre><code>{
  "mcpServers": {
    "mcp-nexus": {
      "url": "${baseUrl}/mcp",
      "headers": {
        "Authorization": "Bearer &lt;client_token&gt;"
      }
    }
  }
}</code></pre>

  <p>Running on Cloudflare Workers</p>
</body>
</html>`;

  return c.html(html);
});

// Mount admin API routes
app.route('/admin/api', adminRouter);

// Admin UI - redirect to Pages or serve embedded
app.get('/admin', (c) => {
  // If ADMIN_UI_URL is set, redirect to Pages deployment
  if (c.env.ADMIN_UI_URL) {
    return c.redirect(c.env.ADMIN_UI_URL);
  }

  // Otherwise serve a minimal embedded admin page
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MCP Nexus Admin</title>
  <style>
    :root { --bg: #0f172a; --fg: #e2e8f0; --accent: #3b82f6; --card-bg: #1e293b; }
    @media (prefers-color-scheme: light) { :root { --bg: #f8fafc; --fg: #1e293b; --card-bg: #e2e8f0; } }
    body { font-family: system-ui, sans-serif; background: var(--bg); color: var(--fg); margin: 0; padding: 2rem; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { color: var(--accent); margin-bottom: 2rem; }
    .card { background: var(--card-bg); padding: 1.5rem; border-radius: 0.5rem; margin-bottom: 1rem; }
    .card h2 { margin-top: 0; color: var(--accent); }
    a { color: var(--accent); }
    .info { opacity: 0.7; font-size: 0.9rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>MCP Nexus Admin</h1>

    <div class="card">
      <h2>Quick Setup</h2>
      <p>To get started, you'll need to:</p>
      <ol>
        <li>Set the <code>ADMIN_API_TOKEN</code> secret: <code>wrangler secret put ADMIN_API_TOKEN</code></li>
        <li>Set the <code>KEY_ENCRYPTION_SECRET</code> secret: <code>wrangler secret put KEY_ENCRYPTION_SECRET</code></li>
        <li>Add your Tavily and/or Brave API keys via the API</li>
      </ol>
    </div>

    <div class="card">
      <h2>API Endpoints</h2>
      <ul>
        <li><strong>GET /admin/api/tavily-keys</strong> - List Tavily API keys</li>
        <li><strong>POST /admin/api/tavily-keys</strong> - Add a Tavily API key</li>
        <li><strong>GET /admin/api/brave-keys</strong> - List Brave API keys</li>
        <li><strong>POST /admin/api/brave-keys</strong> - Add a Brave API key</li>
        <li><strong>GET /admin/api/tokens</strong> - List client tokens</li>
        <li><strong>POST /admin/api/tokens</strong> - Create a client token</li>
      </ul>
      <p class="info">All endpoints require Authorization: Bearer YOUR_ADMIN_TOKEN header</p>
    </div>

    <div class="card">
      <h2>Full Admin UI</h2>
      <p>For a full-featured Admin UI, deploy the admin-ui package to Cloudflare Pages and set the ADMIN_UI_URL environment variable.</p>
    </div>
  </div>
</body>
</html>`;
  return c.html(html);
});

// Catch-all for admin routes (SPA support)
app.get('/admin/*', (c) => {
  if (c.env.ADMIN_UI_URL) {
    return c.redirect(c.env.ADMIN_UI_URL + c.req.path.replace('/admin', ''));
  }
  return c.redirect('/admin');
});

// Export the app for the worker entry point
export { app };

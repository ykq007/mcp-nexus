# Cloudflare Deployment Guide

This guide covers deploying MCP Nexus to Cloudflare's free tier.

## Prerequisites

- Cloudflare account (free tier works)
- Node.js 18+
- Wrangler CLI (`npm install -g wrangler`)

## Architecture

The deployment uses:
- **Cloudflare Workers** - Main API and MCP server
- **Cloudflare D1** - SQLite database (500MB free)
- **Cloudflare Durable Objects** - Session management (free in 2025)
- **Cloudflare Pages** (optional) - Admin UI static hosting

## Deployment Steps

### 1. Login to Cloudflare

```bash
wrangler login
```

### 2. Create D1 Database

```bash
cd packages/worker
wrangler d1 create mcp-nexus-db
```

Copy the database_id from the output and update `wrangler.jsonc`:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "mcp-nexus-db",
    "database_id": "YOUR_DATABASE_ID_HERE"
  }
]
```

### 3. Run Database Migration

```bash
# Apply schema to remote database
wrangler d1 execute mcp-nexus-db --remote --file=migrations/0001_init.sql
```

### 4. Set Secrets

```bash
# Admin API token (generate a secure random string)
wrangler secret put ADMIN_API_TOKEN

# Encryption key for API keys (base64-encoded 32-byte key)
# Generate: openssl rand -base64 32
wrangler secret put KEY_ENCRYPTION_SECRET
```

### 5. Deploy Worker

```bash
wrangler deploy
```

The worker will be available at: `https://mcp-nexus.<your-subdomain>.workers.dev`

### 6. (Optional) Deploy Admin UI to Pages

```bash
cd ../admin-ui
npm run build

# Deploy to Pages
wrangler pages deploy dist --project-name mcp-nexus-admin
```

Then set the ADMIN_UI_URL environment variable:

```bash
cd ../worker
wrangler vars put ADMIN_UI_URL https://mcp-nexus-admin.pages.dev/admin
```

## Configuration

### Environment Variables

Set in `wrangler.jsonc` or via `wrangler vars put`:

| Variable | Description | Default |
|----------|-------------|---------|
| `MCP_RATE_LIMIT_PER_MINUTE` | Per-client rate limit | 60 |
| `MCP_GLOBAL_RATE_LIMIT_PER_MINUTE` | Global rate limit | 600 |
| `TAVILY_KEY_SELECTION_STRATEGY` | Key selection: round_robin, random | round_robin |
| `ADMIN_UI_URL` | URL to Admin UI (if hosted separately) | - |

### Secrets (via `wrangler secret put`)

| Secret | Description |
|--------|-------------|
| `ADMIN_API_TOKEN` | Token for admin API access |
| `KEY_ENCRYPTION_SECRET` | Base64 key for encrypting API keys |

## Usage

### Add API Keys via Admin API

```bash
# Add a Tavily key
curl -X POST https://your-worker.workers.dev/admin/api/tavily-keys \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"label": "My Tavily Key", "key": "tvly-xxx..."}'

# Add a Brave key
curl -X POST https://your-worker.workers.dev/admin/api/brave-keys \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"label": "My Brave Key", "key": "BSA-xxx..."}'
```

### Create Client Token

```bash
curl -X POST https://your-worker.workers.dev/admin/api/tokens \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"description": "My MCP Client"}'
```

Save the returned token - it's only shown once!

### Configure MCP Client

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "mcp-nexus": {
      "url": "https://your-worker.workers.dev/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_CLIENT_TOKEN"
      }
    }
  }
}
```

## Free Tier Limits

| Resource | Limit |
|----------|-------|
| Workers requests | 100,000/day |
| Workers CPU time | 10ms/request |
| D1 storage | 500MB |
| D1 reads | 5M/day |
| D1 writes | 100K/day |
| Durable Objects | Free in 2025 |

## Local Development

```bash
cd packages/worker

# Create local D1 database
wrangler d1 execute mcp-nexus-db --local --file=migrations/0001_init.sql

# Start dev server
npm run dev
```

## Troubleshooting

### "No API keys configured"
Add Tavily or Brave API keys via the admin API.

### "Authorization header required"
Include the client token in the Authorization header.

### "Token has been revoked"
Generate a new client token.

### D1 errors
Check that the database_id in wrangler.jsonc matches your D1 database.

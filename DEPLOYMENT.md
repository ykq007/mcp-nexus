# 🚀 Production Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying MCP Nexus to production. The system supports two deployment modes:

1. **Node.js Server** - Self-hosted on any server with Node.js
2. **Cloudflare Worker** - Serverless deployment on Cloudflare's edge network

## Prerequisites

### For Node.js Deployment
- Node.js 18+ installed
- SQLite3 installed
- Process manager (PM2, systemd, or Docker)
- Reverse proxy (nginx, Caddy) for HTTPS

### For Cloudflare Deployment
- Cloudflare account (free tier works)
- Wrangler CLI installed: `npm install -g wrangler`
- Logged in: `wrangler login`

## Pre-Deployment Checklist

Before deploying, complete the [Production Checklist](../../PRODUCTION_CHECKLIST.md):

```bash
# Run verification script
./scripts/verify-production-config.sh
```

## Deployment Option 1: Node.js Server

### Step 1: Prepare Environment

```bash
# Clone repository
git clone https://github.com/ykq007/mcp-nexus.git
cd mcp-nexus

# Install dependencies
npm install

# Build all packages
npm run build
```

### Step 2: Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with production values
nano .env
```

**Critical settings to change**:
```bash
# Generate new encryption key
KEY_ENCRYPTION_SECRET=$(openssl rand -base64 32)

# Generate new admin token
ADMIN_API_TOKEN=$(openssl rand -hex 32)

# Set production database path
DATABASE_URL="file:./production.db"

# Set server configuration
HOST="0.0.0.0"
PORT="8787"
```

### Step 3: Run Database Migrations

```bash
cd packages/db
DATABASE_URL="file:./production.db" npx prisma migrate deploy
cd ../..
```

Verify migrations:
```bash
sqlite3 packages/db/production.db ".tables"
# Should show: TavilyKey, BraveKey, ClientToken, TavilyToolUsage, BraveToolUsage, AuditLog, ServerSetting
```

### Step 4: Start Server

**Option A: Using PM2 (Recommended)**

```bash
# Install PM2 globally
npm install -g pm2

# Start server
pm2 start packages/bridge-server/dist/index.js --name mcp-nexus

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

**Option B: Using systemd**

Create `/etc/systemd/system/mcp-nexus.service`:

```ini
[Unit]
Description=MCP Nexus Server
After=network.target

[Service]
Type=simple
User=mcp-nexus
WorkingDirectory=/opt/mcp-nexus
Environment=NODE_ENV=production
EnvironmentFile=/opt/mcp-nexus/.env
ExecStart=/usr/bin/node packages/bridge-server/dist/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable mcp-nexus
sudo systemctl start mcp-nexus
```

**Option C: Using Docker**

```bash
# Build Docker image
docker build -t mcp-nexus .

# Run container
docker run -d \
  --name mcp-nexus \
  -p 8787:8787 \
  -v $(pwd)/production.db:/app/production.db \
  -v $(pwd)/.env:/app/.env \
  --restart unless-stopped \
  mcp-nexus
```

### Step 5: Setup Reverse Proxy (nginx)

Create `/etc/nginx/sites-available/mcp-nexus`:

```nginx
server {
    listen 80;
    server_name mcp.yourdomain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name mcp.yourdomain.com;

    # SSL certificates (use Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/mcp.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mcp.yourdomain.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Proxy to Node.js server
    location / {
        proxy_pass http://localhost:8787;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/mcp-nexus /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### Step 6: Setup SSL with Let's Encrypt

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d mcp.yourdomain.com

# Auto-renewal is configured automatically
```

### Step 7: Initial Configuration

```bash
# Add Tavily API key
curl -X POST https://mcp.yourdomain.com/admin/api/tavily-keys \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"label": "Production Key", "key": "tvly-xxx..."}'

# Add Brave API key (optional)
curl -X POST https://mcp.yourdomain.com/admin/api/brave-keys \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"label": "Production Key", "key": "BSA-xxx..."}'

# Create client token with scoping and rate limit
curl -X POST https://mcp.yourdomain.com/admin/api/tokens \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Production Client",
    "allowedTools": ["tavily_search", "brave_web_search"],
    "rateLimit": 120
  }'
```

## Deployment Option 2: Cloudflare Worker

See [packages/worker/DEPLOY.md](packages/worker/DEPLOY.md) for detailed Cloudflare deployment instructions.

**Quick summary**:

```bash
cd packages/worker

# Create D1 database
wrangler d1 create mcp-nexus-db

# Update wrangler.jsonc with database_id

# Run migrations
wrangler d1 execute mcp-nexus-db --remote --file=migrations/0001_init.sql
wrangler d1 execute mcp-nexus-db --remote --file=migrations/0002_add_token_scoping_and_rate_limit.sql

# Set secrets
wrangler secret put ADMIN_API_TOKEN
wrangler secret put KEY_ENCRYPTION_SECRET

# Deploy
wrangler deploy
```

## Post-Deployment Verification

### 1. Health Check

```bash
curl https://mcp.yourdomain.com/health
# Expected: {"ok": true, ...}
```

### 2. Admin API Test

```bash
curl https://mcp.yourdomain.com/admin/api/tavily-keys \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
# Expected: Array of keys
```

### 3. MCP Endpoint Test

```bash
curl -X POST https://mcp.yourdomain.com/mcp \
  -H "Authorization: Bearer YOUR_CLIENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
# Expected: List of available tools
```

### 4. Admin UI Test

Open `https://mcp.yourdomain.com/admin` in browser and verify:
- [ ] Login works
- [ ] Dashboard shows metrics
- [ ] Playground is functional
- [ ] Token creation with scoping works
- [ ] All pages load without errors

## Monitoring & Maintenance

### Logs

**Node.js (PM2)**:
```bash
pm2 logs mcp-nexus
pm2 logs mcp-nexus --lines 100
```

**Node.js (systemd)**:
```bash
sudo journalctl -u mcp-nexus -f
```

**Cloudflare Worker**:
```bash
wrangler tail
```

### Metrics

Monitor these key metrics:
- Request rate and latency
- Error rate
- Rate limit hits
- API key usage
- Database size

### Backup

**Node.js (SQLite)**:
```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d)
sqlite3 production.db ".backup backup-$DATE.db"
# Keep last 30 days
find . -name "backup-*.db" -mtime +30 -delete
```

**Cloudflare (D1)**:
```bash
# Export data
wrangler d1 export mcp-nexus-db --remote --output=backup.sql
```

### Updates

```bash
# Pull latest code
git pull origin main

# Install dependencies
npm install

# Build
npm run build

# Run new migrations (if any)
cd packages/db
npx prisma migrate deploy
cd ../..

# Restart server
pm2 restart mcp-nexus
# or
sudo systemctl restart mcp-nexus
```

## Troubleshooting

### Server won't start

1. Check logs: `pm2 logs mcp-nexus` or `journalctl -u mcp-nexus`
2. Verify environment variables: `./scripts/verify-production-config.sh`
3. Check database: `sqlite3 production.db ".tables"`
4. Verify port is not in use: `lsof -i :8787`

### "No API keys configured"

Add API keys via admin API:
```bash
curl -X POST https://mcp.yourdomain.com/admin/api/tavily-keys \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"label": "Key 1", "key": "tvly-xxx..."}'
```

### Rate limit errors

Check and adjust rate limits:
- Global: `MCP_GLOBAL_RATE_LIMIT_PER_MINUTE` (default: 600)
- Per-client: `MCP_RATE_LIMIT_PER_MINUTE` (default: 60)
- Per-token: Set custom `rateLimit` when creating token

### Database locked errors

SQLite doesn't handle high concurrency well. Consider:
1. Increase `PRAGMA busy_timeout`
2. Use WAL mode: `PRAGMA journal_mode=WAL`
3. Or migrate to PostgreSQL for high-traffic deployments

## Security Best Practices

1. **Secrets Management**
   - Never commit `.env` to git
   - Use strong random values for all secrets
   - Rotate secrets regularly

2. **Network Security**
   - Always use HTTPS in production
   - Configure firewall to only allow necessary ports
   - Use fail2ban to prevent brute force attacks

3. **Access Control**
   - Limit admin API access by IP if possible
   - Use strong admin tokens (32+ bytes)
   - Regularly audit client tokens

4. **Monitoring**
   - Set up alerts for high error rates
   - Monitor for unusual API usage patterns
   - Review audit logs regularly

## Support

- **Documentation**: https://github.com/ykq007/mcp-nexus
- **Issues**: https://github.com/ykq007/mcp-nexus/issues
- **Security**: Report security issues privately

---

**Last Updated**: 2026-02-09
**Version**: 1.0.0 (Phase 3 Complete)

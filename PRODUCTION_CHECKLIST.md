# 🚀 Production Deployment Checklist

## Pre-Deployment Verification

### ✅ Phase 1: Environment Configuration

#### Node.js Server (.env)
- [ ] `DATABASE_URL` - Set to production database path
- [ ] `KEY_ENCRYPTION_SECRET` - Generate new secure key (32 bytes, base64)
  ```bash
  openssl rand -base64 32
  ```
- [ ] `ADMIN_API_TOKEN` - Generate new secure token
  ```bash
  openssl rand -hex 32
  ```
- [ ] `HOST` - Set to `0.0.0.0` for production
- [ ] `PORT` - Set to desired port (default: 8787)
- [ ] `MCP_RATE_LIMIT_PER_MINUTE` - Review and adjust (default: 60)
- [ ] `MCP_GLOBAL_RATE_LIMIT_PER_MINUTE` - Review and adjust (default: 600)
- [ ] `SEARCH_SOURCE_MODE` - Set based on available API keys
- [ ] `TAVILY_USAGE_HASH_SECRET` - Set for secure query hashing
- [ ] `BRAVE_USAGE_HASH_SECRET` - Set for secure query hashing

#### Cloudflare Worker (wrangler.jsonc)
- [ ] `database_id` - Set to production D1 database ID
- [ ] Secrets configured via `wrangler secret put`:
  - [ ] `ADMIN_API_TOKEN`
  - [ ] `KEY_ENCRYPTION_SECRET`
- [ ] Environment variables set:
  - [ ] `MCP_RATE_LIMIT_PER_MINUTE`
  - [ ] `MCP_GLOBAL_RATE_LIMIT_PER_MINUTE`
  - [ ] `TAVILY_KEY_SELECTION_STRATEGY`

### ✅ Phase 2: Database Migration

#### Node.js (Prisma)
```bash
cd packages/db
DATABASE_URL="file:./production.db" npx prisma migrate deploy
```

Verify migrations applied:
- [ ] `20260202124042_init`
- [ ] `20260202154903_add_brave_keys`
- [ ] `20260203110006_add_brave_tool_usage`
- [ ] `20260209080847_add_token_scoping_and_rate_limit`

#### Cloudflare Worker (D1)
```bash
cd packages/worker
wrangler d1 execute mcp-nexus-db --remote --file=migrations/0001_init.sql
wrangler d1 execute mcp-nexus-db --remote --file=migrations/0002_add_token_scoping_and_rate_limit.sql
```

Verify tables exist:
- [ ] `TavilyKey`
- [ ] `BraveKey`
- [ ] `ClientToken` (with `allowedTools` and `rateLimit` columns)
- [ ] `TavilyToolUsage`
- [ ] `BraveToolUsage`
- [ ] `AuditLog`
- [ ] `ServerSetting`

### ✅ Phase 3: Security Verification

#### Secrets Management
- [ ] All secrets use strong random values (not example values)
- [ ] `KEY_ENCRYPTION_SECRET` is unique per environment
- [ ] `ADMIN_API_TOKEN` is unique per environment
- [ ] Secrets are not committed to git
- [ ] `.env` file is in `.gitignore`

#### API Security
- [ ] Admin API requires authentication (`ADMIN_API_TOKEN`)
- [ ] Client tokens use SHA-256 hashing
- [ ] API keys are encrypted at rest (AES-256-GCM)
- [ ] Rate limiting is enabled
- [ ] CORS is properly configured (if needed)

#### Database Security
- [ ] Database file permissions are restricted (Node.js)
- [ ] D1 database is not publicly accessible (Worker)
- [ ] Audit logging is enabled
- [ ] Sensitive data is encrypted

### ✅ Phase 4: Functionality Testing

#### API Endpoints (Node.js)
Test with production-like environment:

```bash
# Health check
curl http://localhost:8787/health

# Admin API - List keys (should require auth)
curl http://localhost:8787/admin/api/tavily-keys \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Create client token
curl -X POST http://localhost:8787/admin/api/tokens \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"description": "Test Token", "allowedTools": ["tavily_search"], "rateLimit": 100}'

# MCP endpoint (should require client token)
curl -X POST http://localhost:8787/mcp \
  -H "Authorization: Bearer YOUR_CLIENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'
```

Checklist:
- [ ] Health endpoint returns 200
- [ ] Admin API requires authentication
- [ ] Client token creation works
- [ ] Token scoping works (Phase 3.4)
- [ ] Custom rate limits work (Phase 3.5)
- [ ] MCP endpoint requires client token
- [ ] Tool calls work with valid API keys

#### API Endpoints (Cloudflare Worker)
```bash
# Replace with your worker URL
WORKER_URL="https://mcp-nexus.your-subdomain.workers.dev"

# Health check
curl $WORKER_URL/health

# Admin API
curl $WORKER_URL/admin/api/tavily-keys \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Create client token with scoping
curl -X POST $WORKER_URL/admin/api/tokens \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"description": "Test Token", "allowedTools": ["tavily_search"], "rateLimit": 100}'

# MCP endpoint
curl -X POST $WORKER_URL/mcp \
  -H "Authorization: Bearer YOUR_CLIENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

Checklist:
- [ ] Worker is deployed and accessible
- [ ] D1 database is connected
- [ ] Durable Objects are working (rate limiting)
- [ ] Admin API works
- [ ] Token scoping works (Phase 3.4)
- [ ] Custom rate limits work (Phase 3.5)
- [ ] MCP endpoint works

#### Admin UI
- [ ] UI loads correctly
- [ ] Can login with admin token
- [ ] Dashboard shows metrics (Phase 3.1)
- [ ] Playground works (Phase 3.2)
- [ ] Onboarding guide appears for new users (Phase 3.3)
- [ ] Token creation with tool scoping works (Phase 3.4)
- [ ] Token creation with rate limit works (Phase 3.5)
- [ ] Cost estimation displays (Phase 3.6)
- [ ] All pages load without errors

### ✅ Phase 5: Performance & Monitoring

#### Performance
- [ ] Response times are acceptable (<500ms for most requests)
- [ ] Database queries are optimized
- [ ] Rate limiting works under load
- [ ] Memory usage is stable
- [ ] No memory leaks detected

#### Monitoring Setup
- [ ] Error logging is configured
- [ ] Access logs are enabled
- [ ] Audit logs are being written
- [ ] Usage statistics are being collected
- [ ] Alerts are configured for:
  - [ ] High error rates
  - [ ] Rate limit exceeded
  - [ ] API key failures
  - [ ] Database errors

#### Logging
- [ ] Application logs are structured
- [ ] Log levels are appropriate (INFO for production)
- [ ] Sensitive data is not logged (API keys, tokens)
- [ ] Logs are being persisted/forwarded

### ✅ Phase 6: Documentation

- [ ] README.md is up to date
- [ ] DEPLOY.md has deployment instructions
- [ ] API documentation is current
- [ ] Environment variables are documented
- [ ] Migration guide exists (if upgrading)
- [ ] Troubleshooting guide is available

### ✅ Phase 7: Backup & Recovery

#### Backup Strategy
- [ ] Database backup plan is in place
- [ ] Backup frequency is defined
- [ ] Backup retention policy is set
- [ ] Backup restoration has been tested

#### Recovery Plan
- [ ] Disaster recovery plan exists
- [ ] RTO (Recovery Time Objective) is defined
- [ ] RPO (Recovery Point Objective) is defined
- [ ] Rollback procedure is documented

### ✅ Phase 8: Final Checks

#### Pre-Launch
- [ ] All tests pass (`npm test`)
- [ ] Build succeeds (`npm run build`)
- [ ] No TypeScript errors
- [ ] No security vulnerabilities (`npm audit`)
- [ ] Dependencies are up to date
- [ ] Git repository is clean
- [ ] Latest changes are pushed to remote

#### Launch
- [ ] Deploy to production environment
- [ ] Verify deployment succeeded
- [ ] Run smoke tests
- [ ] Monitor for errors (first 30 minutes)
- [ ] Verify metrics are being collected

#### Post-Launch
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Verify API key usage
- [ ] Review audit logs
- [ ] Collect user feedback

## Rollback Plan

If issues are detected:

1. **Immediate**: Revert to previous deployment
   ```bash
   # Node.js
   git checkout <previous-commit>
   npm run build
   pm2 restart mcp-nexus

   # Cloudflare Worker
   wrangler rollback
   ```

2. **Database**: Restore from backup if needed
   ```bash
   # Node.js
   cp backup.db production.db

   # Cloudflare Worker
   # Contact Cloudflare support for D1 restoration
   ```

3. **Verify**: Run smoke tests after rollback

## Support Contacts

- **Technical Issues**: [Your support email]
- **Security Issues**: [Your security email]
- **Cloudflare Support**: https://dash.cloudflare.com/support

## Notes

- This checklist should be completed before each production deployment
- Keep this document updated as the system evolves
- Review and update security practices regularly
- Conduct periodic security audits

---

**Last Updated**: 2026-02-09
**Version**: 1.0.0 (Phase 3 Complete)

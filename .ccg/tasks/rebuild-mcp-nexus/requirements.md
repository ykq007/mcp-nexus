# 需求基线 — 从零重写 mcp-nexus（功能对等）

## 目标
在新分支 `rebuild-mcp-nexus` 上，**保留 Cloudflare Workers + D1 + Durable Objects + Hono 技术栈**，从零重写整套系统，达到与现有线上版本 **功能对等 (parity)**，并用 **impeccable / frontend-design** 技能重新设计前端（Admin UI + Landing Page）。

## 硬约束
1. **Schema 兼容** — 线上 D1 `mcp-nexus-db`（id `43123549-…`）已有生产数据。重写不可做破坏性表结构变更；新表/新列以增量迁移追加。
2. **部署链路不变** — `wrangler deploy` + `wrangler d1 migrations apply DB --remote`，account `06cf…`，worker 名 `mcp-nexus`，域名 `mcp-nexus.ykq001.workers.dev`。
3. **环境变量/Secret 契约不变** — `ADMIN_API_TOKEN`、`KEY_ENCRYPTION_SECRET`、`TAVILY_USAGE_HASH_SECRET?`、`BRAVE_USAGE_HASH_SECRET?` + wrangler.jsonc 的 vars。
4. **加密格式兼容** — AES-256-GCM，IV(12B)+密文，key 支持 base64/hex 解码为 32 字节。现有加密数据必须能解密。
5. **Token 哈希兼容** — SHA-256，prefix 取前 8 字符。现有 token 仍可鉴权。

## 功能对等清单（验收标准）

### MCP 端点（/mcp）
- JSON-RPC：`initialize`（protocolVersion 2024-11-05）、`tools/list`、`tools/call`
- 9 个工具：`tavily_search` / `tavily_extract` / `tavily_crawl` / `tavily_map` / `tavily_research`（可开关，轮询）/ `brave_web_search` / `brave_local_search`
- 4 种搜索源模式：`tavily_only` / `brave_only` / `combined`（并行+去重+交错）/ `brave_prefer_tavily_fallback`（默认）
- 双层限流：per-client（token 可覆盖）+ global，DO 滑窗
- Token scoping：`allowedTools` 白名单；per-token `rateLimit` 覆盖
- 用量日志：4 模式（none/hash/preview/full）+ 脱敏（email/hex/token/tvly-/mcp_/URL 参数）+ fire-and-forget

### Admin API（/admin/api/*，Bearer = ADMIN_API_TOKEN）
- server-info GET/PATCH（策略 + 搜索模式）
- tavily-keys：CRUD + reveal + refresh-credits + sync-credits（/usage 端点 + 分布式锁）
- brave-keys：CRUD + reveal
- tokens：list/create/delete/revoke/reveal（reveal 限流 + 审计）
- usage：分页查询 + summary + metrics + cost-estimate
- settings：GET/PUT（ServerSetting KV）
- keys/export + keys/import（schemaVersion 1，去重 + 重命名）
- legacy 别名 /admin/api/keys → tavily-keys

### 鉴权
- clientAuth：Bearer/raw/query(token,tavilyApiKey 仅 ENABLE_QUERY_AUTH)；prefix 查找 + SHA-256 常量时间比对；revoked/expired 检查
- adminAuth：常量时间比对 ADMIN_API_TOKEN

### 数据模型（保持现有表）
TavilyKey / BraveKey / ClientToken / TavilyToolUsage / BraveToolUsage / ServerSetting / AuditLog / AdminUser / ResearchJob（列定义见 contract，索引保持）

### 前端（impeccable 重设计 — 视觉全新，功能对等）
- Admin UI 6 页：Overview / Keys / Tokens / Usage / Playground / Settings
- Landing Page：Hero / Features / Footer / Admin 登录弹窗
- 保留：i18n（中/英）、登录态、SPA 路由、复制/确认弹窗/Drawer/DataTable/分页/Toast 等交互
- 全新：设计语言、配色（OKLCH）、排版、间距、动效 —— 用 frontend-design 技能，避免 AI 通用感

## 非目标
- 不改变部署目标账号/数据库
- 不引入新的后端运行时
- 不做功能裁剪（parity）

## 完整性评分：9/10
目标明确、范围清晰（现有代码即规格）、边界明确（schema/部署兼容）、约束完整。唯一开放项为前端设计风格方向（impeccable 内多个变体），将在前端阶段确认。

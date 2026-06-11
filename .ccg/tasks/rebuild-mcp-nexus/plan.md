# 实施计划 — 从零重写 mcp-nexus（功能对等 + impeccable 前端）

## 总体策略
在新分支 `rebuild-mcp-nexus` 上 **原地、模块化重写**，保留部署/构建链路与 D1 schema 兼容性。按 6 个里程碑顺序推进，每个里程碑结束做 typecheck + 单测自检，可在节点 check-in。

## 架构决策
- **保留**：CF Workers + Hono + D1 + Durable Objects；wrangler.jsonc 的 bindings/vars；AES-256-GCM 加密格式；SHA-256 token 哈希；D1 表结构。
- **重写**：所有 `packages/worker/src/**` 源码（干净实现，行为等价 + 测试护栏）；整个 `packages/admin-ui` 与 `packages/landing-page` 前端（impeccable 全新设计）。
- **schema 兼容**：复用现有 migrations，不做破坏性改表。新代码读写同一组表，保证线上数据可用。
- **加密兼容自检**：M1 写一个用现有 `KEY_ENCRYPTION_SECRET` 解密线上一条 key 的测试，确保 round-trip 兼容。

## 里程碑

### M0 — 基础脚手架 & 共享层
- 确认 monorepo 包布局（沿用 packages/* 或精简）
- `env.ts`（所有 binding/var 类型）、`crypto/`（encrypt/decrypt/importKey/generateToken/maskApiKey）、`db/d1.ts`（全表查询封装）
- 复用/校验 `packages/db` schema 与 migrations
- 验收：crypto 单测通过（含与现有格式 round-trip 兼容）

### M1 — 后端核心（MCP + 搜索）
- `services/`：tavilyClient（search/extract/crawl/map/research 轮询）、braveClient（web/local）、keyPool（选 key + cooldown/invalid 标记）
- `mcp/`：searchSource（4 模式解析）、combinedMerge（交错去重）、braveFormat、mcpHandler（JSON-RPC 派发 + 工具 schema + 错误映射）、mcpSession DO 占位
- `rateLimit/rateLimiter.ts`（DO 滑窗）
- `utils/usageLog.ts`（hash/preview/脱敏）+ redact
- 验收：mcpHandler / merge / usageLog / rateLimiter 单测；tools/list 输出与现有契约一致

### M2 — 后端 Admin API + 鉴权
- `middleware/`：clientAuth（Bearer/raw/query + prefix + 常量时间比对 + revoked/expired）、adminAuth
- `routes/admin/`：server-info、tavily-keys（CRUD/reveal/refresh-credits/sync-credits）、brave-keys（CRUD/reveal）、tokens（CRUD/revoke/reveal 限流+审计）、usage（list/summary/metrics/cost-estimate）、settings、keys export/import、legacy 别名
- `app.ts` + `index.ts`：路由挂载、CORS、health、SSE 代理、SPA fallback
- 验收：每条路由集成测试（mock D1）；admin auth 401 路径覆盖

### M3 — 前端设计系统（impeccable 核心）★
- 调用 frontend-design 技能确立设计语言：OKLCH 配色、排版尺度、间距系统、动效、暗色模式
- 设计 tokens（CSS 变量）+ 基础组件原语（Button/Card/Table/Dialog/Drawer/Toast/Badge/Input/Tabs 等）
- App Shell：侧栏导航 + 顶栏 + 响应式
- 验收：设计系统 storybook 式预览页 + 关键组件可用

### M4 — Admin UI 6 页（功能对等，全新视觉）
- Overview（KPI/metrics 仪表盘）、Keys（Tavily/Brave 双 tab + credits + reveal + 导入导出）、Tokens（创建/scoping/限流/reveal）、Usage（分页表 + 过滤 + summary + cost）、Playground（MCP 调用试验）、Settings
- `lib/adminApi.ts` 对接 M2 接口；i18n（中/英）；登录态/RequireAuth
- 验收：6 页跑通真实/mock 数据，关键交互单测

### M5 — Landing Page（impeccable）
- Hero / Features / Footer / Navbar / Admin 登录弹窗，与 Admin UI 同一设计语言
- 验收：构建产物 + 登录跳转链路

### M6 — 构建/部署 & 验证
- build 脚本（vite build + syncAdminUiPublic + syncLandingPagePublic → worker/public）
- 根 `npm run build` / `typecheck` / `test` 全绿
- `wrangler deploy --dry-run` 通过；不动线上，交付前由你决定是否真正 deploy
- 验收：health/admin/mcp 本地 `wrangler dev` 自测

## 测试策略
- 后端：vitest 单测（crypto/merge/usageLog/handler/routes mock D1）
- 前端：vitest + testing-library 关键组件/页面
- 端到端自测：`wrangler dev` 本地起服务，curl /health /mcp + Admin UI 手测
- 兼容护栏：加密 round-trip、token 哈希、D1 查询语义对照现有实现

## 风险与缓解
| 风险 | 缓解 |
|------|------|
| 后端重写引入回归（加密/哈希/查询语义不兼容线上数据） | 兼容性单测 + 行为对照；保留旧代码到 git 历史可 diff |
| 工程量大、一次难完成 | 里程碑增量交付，每个 M 可独立 check-in |
| 前端设计方向与预期不符 | M3 先确认设计语言再铺开 M4/M5 |
| 线上 schema 漂移 | 复用现有 migrations，不破坏性改表 |

## 开放决策（计划审批时确认）
1. 后端重写深度：真·全量重写 vs 干净重构（行为等价）
2. impeccable 设计方向（风格变体）
3. 是否精简 monorepo 包结构

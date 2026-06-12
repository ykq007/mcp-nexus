# Functional Inventory — current mcp-nexus UI (redesign baseline)

> Captured from `packages/admin-ui` + `packages/landing-page` before redesign.
> This is the must-preserve feature set. No feature is removed unless the PRD
> explicitly cuts it.

## 1. Admin console — per page

### Overview (`OverviewPage.tsx`)
Dashboard landing. KPI cards (Tavily keys total + active/unhealthy; Client tokens
total + active/revoked; Usage recent count) — each navigates to its page. Live
metrics card: requests/min, requests/hour, active tokens, active keys, unhealthy
keys, Tavily credits used, Brave est. cost (USD, may be null), recent errors list.
Recent-usage table (last 10): timestamp, tool, outcome badge, query preview/hash.
Refresh button; "View all" → Usage. Onboarding guide card when no keys/tokens
(dismissible, localStorage). Skeleton loading; ErrorBanner + retry.

### Keys (`KeysPage.tsx`, 1080 lines)
Two sections: **Tavily** and **Brave**.
Tavily: KPI cards (total capacity from remainingCredits, active count, % healthy).
Table cols: select checkbox, label (filterable), API key (masked + reveal via
`KeyRevealCell`), credits (remaining/total + refresh via `KeyCreditsCell`), status
badge (active/disabled/cooldown/invalid, clickable StatusMenu), last used, created,
delete. Actions: search by label; filter by status; sort (created desc/asc, label
A-Z/Z-A, lastUsed, status); multi-select (select-all current page) → bulk refresh
credits, bulk delete (typed "DELETE"); create dialog (label + apiKey, validates
`tvly-` prefix, blur validation); update status via menu; delete single (typed
"DELETE"); per-key + bulk credit refresh; "Sync all" credits (total/success/failed);
import/export to file + clipboard (`ImportExportActions`, `ExportKeysDialog`,
`FileImportDialog`, `ClipboardImportDialog`) with rename/skip/failure reporting.
`?create=1` auto-opens create. 10/page pagination (resets on filter change).
Empty + filtered-empty + loading skeleton + error states.
Brave: same shape, simpler — statuses active/disabled/invalid (no cooldown), no
credits/capacity, no bulk, no multi-select, no credit sync.

### Tokens (`TokensPage.tsx`, 1181 lines)
Client auth tokens. Header stats (total, active = active+expiring). Table cols:
token prefix (mono) + description line; status badge (active/expiring/expired/
revoked w/ icon); scope ("All tools" or "N tools" + rate limit "N req/min");
expires (relative or "—"); created; actions = Reveal button + ActionMenu (Configure
client, Revoke, Delete). Search (debounced 250ms) by prefix/description; status
SegmentedControl filter (all/active/expiring/expired/revoked).
Create flow: **Step 1 form** — description; expires-in segmented (never/1h/24h/7d/
30d/90d/custom → number+unit); allowed tools segmented (all / restrict → tool
groups Tavily[search/extract/crawl/map/research] + Brave[web_search/local_search]
with per-group select-all); rate-limit checkbox → req/min. **Step 2 copy** —
cleartext token in a well, copy, "Setup client".
Reveal flow (30s window): Reveal → modal via `GET /tokens/:id/reveal`, cleartext +
countdown (visual + live region), auto-clear on blur/tab-hidden/timeout, copy +
"Use in setup". Configure client → reveal → loads token into Setup drawer.
Setup drawer (right slide): MCP endpoint (read-only, from apiBaseUrl+origin),
client token field (paste/auto), config snippets SegmentedControl across targets
(http-curl, Docker, …) from `mcpSetupTemplates`, copy snippet + code textarea.
Revoke (soft, ConfirmDialog) keeps row as revoked; Delete (hard, typed "DELETE").
`?create=1` / `?setup=1` deep-links. Status derived from (revoked, expiresAt, now).
10/page pagination. Empty/filtered-empty/loading/error states.

### Usage (`UsagePage.tsx`)
Audit log. Filters: tool (select), outcome (all/success/error), client token prefix
(debounced 400ms), date from, date to; summary "N total events". Table cols:
timestamp, tool, outcome badge, token prefix (mono/—), query preview (or hash+…/—),
latency (ms/—). Row → detail modal: timestamp, token prefix, upstream key id,
latency, query, error message (if error), arguments JSON (read-only). Date inputs →
ISO start/end of local day. 20/page pagination (resets on filter change). Empty +
error states.

### Playground (`PlaygroundPage.tsx`)
MCP tool sandbox. Request panel: client token (password, sticky localStorage), tool
selector (sticky), JSON params (sticky). Execute → response panel: status badge
(SUCCESS/ERROR) + duration ms + JSON viewer (collapsible). History table: time
(relative), tool, status, duration, "Load params". Clear button. MCP session id
(`mcp-session-id` header), auto-reinit on timeout, two-attempt retry. JSON-RPC 2.0
(initialize, tools/call). History localStorage ≤50.

### Settings (`SettingsPage.tsx`)
Admin API base URL (mono input + scheme warning) + Test Connection (calls listKeys,
toasts success/auth/404/network). Auth status badge + Change token / Sign in / Sign
out. Language select (en / zh-CN, applies immediately). Server settings (needs auth,
from `/server-info`): Tavily key strategy (round_robin/random + save); search-source
mode (brave_prefer_tavily_fallback / combined / tavily_only / brave_only + save +
cost warning on combined + unavailability warning); research toggle. Env-vars note.

## 2. Shared UI component library (`src/ui/*`, `src/app/*`)
DataTable (columns/rows/sort/empty/loading), Dialog (centered modal, focus trap,
Esc/Tab), Drawer (right slide, focus trap), ConfirmDialog (optional requireText
"DELETE"), ActionMenu (ARIA menu, kbd nav, danger variant), StatusMenu (ARIA
listbox badge, smart position), SegmentedControl (ARIA radiogroup, sizes), KpiCard
(value/icon/hint/onClick), MetricsCard (metric array + live badge + skeleton),
CopyButton (clipboard + toast), IconButton (icon-only + spinner), Pagination,
EmptyState, ErrorBanner (+retry), OnboardingGuide (dismiss + localStorage),
ImportExportActions, KeyRevealCell (mask + reveal/hide, auto-hide 15s/blur),
KeyCreditsCell (remaining/total + last-checked + refresh), toast (provider + hook,
success/error/info/warning, auto-dismiss), icons (30+ SVG), Portal. Domain dialogs:
FileImportDialog, ClipboardImportDialog, ExportKeysDialog. Playground: JsonViewer,
ToolSelector.

## 3. App shell & nav
Routes (HashRouter): `/` Overview, `/keys`, `/tokens`, `/usage`, `/playground`,
`/settings`. Sidebar: brand header + 6 nav items (icons) + footer (collapse toggle +
connection info). Top bar: page title/subtitle + connection summary (mono) + theme
toggle (sun/moon) + sign in/out. Mobile bottom nav (same 6). Skip link.
Auth: no session token persisted by console; admin token from landing/Settings;
401 → onAuthFailure clears + redirects to landing w/ toast; remember-me →
localStorage; cross-tab sync via storage event. Theme → `data-theme` on root.
Sidebar collapse → `.sidebar-collapsed`. i18n: en + zh-CN; namespaces common, nav,
keys, tokens, settings, login, overview, usage, playground.

## 4. Admin API surface (`src/lib/adminApi.ts`)
Bearer token. Endpoints: GET/PATCH `/admin/api/server-info`; GET `/metrics`;
keys CRUD `GET/POST /keys`, `GET /keys/:id/reveal`, `PATCH/DELETE /keys/:id`,
`POST /keys/:id/refresh-credits`, `POST /keys/sync-credits`, `GET /keys/export`,
`POST /keys/import`; brave-keys CRUD `GET/POST /brave-keys`, `GET /brave-keys/:id/
reveal`, `PATCH/DELETE /brave-keys/:id`; tokens `GET/POST /tokens`, `GET /tokens/
:id/reveal`, `POST /tokens/:id/revoke`, `DELETE /tokens/:id`; usage `GET /usage`
(paged + filters), `GET /usage/summary`, `GET /cost-estimate`. Errors via
AdminApiError(.status); 401/404/500-html/network handled distinctly.
Key DTOs: TavilyKeyDto(id,label,maskedKey,status,cooldownUntil,lastUsedAt,createdAt,
remainingCredits,totalCredits,lastCheckedAt); BraveKeyDto(id,label,maskedKey,status,
lastUsedAt,createdAt); ClientTokenDto(id,tokenPrefix,description,allowedTools|null,
rateLimit,revokedAt,expiresAt,createdAt); TavilyToolUsageDto(id,timestamp,toolName,
outcome,latencyMs,clientTokenId,clientTokenPrefix,upstreamKeyId,queryHash,
queryPreview,argsJson,errorMessage); ServerInfoDto(tavilyKeySelectionStrategy,
searchSourceMode,braveSearchEnabled,researchEnabled); MetricsDto(requestsPerMinute,
requestsPerHour,activeTokens,keyPool{total,active,unhealthy,tavily,brave},
recentErrors[]); CostEstimateDto(period,tavily,brave,summary).

## 5. Landing page (`packages/landing-page`)
Navbar (brand + links + Open Dashboard), Hero (headline + CTAs), Features (cards),
Footer. AdminLoginModal: admin token (password) + remember checkbox + validate via
`GET /admin/api/keys` + error messages (401/404/network) + focus trap + Esc.
On success: store token (if remember) + redirect to `?next=` allow-listed path.
URL params: `?next=/path`, `?login=1`, `?adminLogin=1`. Cross-tab token sync.

## 6. Domain concepts
**Keys** = upstream provider credentials (Tavily search API / Brave search API);
label + masked key + status + usage meta; Tavily has credits; multiple for load
balancing (round-robin/random). Status: active/disabled/cooldown(Tavily)/invalid.
**Client tokens** = JWT-like tokens issued to client apps calling the MCP endpoint;
prefix visible, secret revealed once; scoped by expiry + allowed tools + rate limit;
status active/expiring/expired/revoked.
**Usage/credits** = Tavily credits (≈1/call), Brave requests (USD est.); usage log
audit trail; cost estimate aggregated by period.
**Playground** = browser sandbox sending MCP JSON-RPC (initialize, tools/call) with
a client token; history in localStorage.
</content>

# 目录结构与 CSS 架构

> admin-ui 在「Graphite & Cobalt」重设计（任务 06-12-redesign-ui-from-scratch）后的实际约定。设计系统规范见根目录 `DESIGN.md`、产品定位见 `PRODUCT.md`。

## 源码布局（`packages/admin-ui/src/`）

```
styles/
  tokens.css        # 唯一 token 源：OKLCH 颜色（light + dark）+ 间距/圆角/阴影/动效/z-scale
  base.css          # reset + body/排版默认 + 全局 :focus-visible ring + skip-link + reduced-motion 基线
  components.css     # 唯一组件类源（.btn/.table/.dialog/.drawer/.badge/.statusMenu/...）
  pages/
    <page>.css      # 每页专属样式，全部规则作用域在 .page-<x> 根类下
    shell.css       # app shell（侧栏/顶栏/移动底栏）
ui/                 # 共享组件词汇（DataTable, Dialog, Drawer, ActionMenu, StatusMenu,
                    #   SegmentedControl, Reveal, Toast, KpiCard, MetricsCard, ...）—— 复用，勿在页面里重造
app/                # Shell、auth、prefs、按页 cell（KeyRevealCell/KeyCreditsCell）
pages/              # 6 个页面（Overview/Keys/Tokens/Usage/Playground/Settings）+ 页面专属子组件
components/         # 页面专属对话框（导入导出、ToolSelector、JsonViewer 等）
lib/                # adminApi、format、tokenStatus、mcpSetupTemplates 等
i18n/locales/{en,zh-CN}/<namespace>.json
```

## CSS 加载顺序（在 `main.tsx`）

`tokens.css → base.css → components.css → styles.css → pages/<page>.css`

- `styles.css` 是**正在收缩的遗留残留**（仅剩 shell 之外的页面布局/工具/排版 helper）；新代码不要往里加。残留清理项见任务 `followup-debt.md`。
- 页面 CSS 由页面组件自行 `import`，并**必须**把规则作用域在 `.page-<x>` 根类下（如 `.page-keys .keys-*`），避免跨页类名碰撞、保证多人并行改不同页面互不冲突。

## 硬约定（禁用模式）

- **颜色只用 token**：禁止 hex/rgb/hsl 硬编码；全部走 `var(--*)`（OKLCH）。禁止 teal/lime（退役 Verdigris/Phosphor）。
- **不复制组件规则到页面/styles.css**：组件类只在 `components.css` 定义一次；重复定义会因 cascade 顺序产生「看不见的覆盖」分歧（曾踩坑：styles.css 整份复制 components.css 把后者全盖掉、且把 4px 间距覆盖成 8px）。
- **状态不能只靠颜色**：status pill = `*-soft` 底 + `*-ink` 字 + 图标。
- **控制台不做页面载入编排**：动效只表达状态；每个动画都要有 `prefers-reduced-motion` 替代；reveal 不得用 class 门控内容可见性。
- **密钥/令牌卫生**：明文经 `ui/Reveal.tsx`（token 变体 30s 倒计时 + blur/隐藏/超时自动清除），抽屉/对话框关闭即从 state/DOM 清除明文。
- **每个交互元素六态齐全**：default·hover·focus-visible·active·disabled·loading，焦点恒有可见 `--ring`。

## i18n

- 每个新文案**同时**写进 `en/` 与 `zh-CN/` 对应 namespace（每页一个 namespace）。`common.json` 为共享，多人改易冲突——优先用自己页面的 namespace。
- 校验 en/zh-CN 键对齐（曾踩坑：硬编码英文串、`t('settings.section.x')` 多写一层 namespace 前缀导致 zh-CN 不翻译）。

## 质量闸门

`npx tsc --noEmit`（admin-ui + landing 都要干净）、`vitest`、`npm run build`（含 `worker/public` + `bridge-server/public` 资产同步）、`knip`（死代码）。改完页面记得 `npm run build` 重新同步 public 产物，否则部署仍是旧 UI。
</content>

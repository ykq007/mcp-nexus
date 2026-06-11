# 设计系统 — Phosphor Ops（M3）

> 用户选定方向 A。磷光终端 / 可观测性控制台美学。刻意避开 Inter / 紫渐变 / 通用 AI 审美，也不同于旧版的赛博朋克霓虹绿（Orbitron + chamfer + glitch）——Phosphor Ops 走**克制、精密、mono-forward**路线。

## 字体
- **Display（标题）**：Clash Display（Fontshare）— 特色 grotesque，硬朗。
- **UI / 数据 / 正文**：JetBrains Mono — mono-forward，营造终端/仪表读数质感。
- 数字一律 `font-variant-numeric: tabular-nums`（读数对齐）。

## 配色（OKLCH，暗色为主）
| Token | 值 | 用途 |
|------|----|------|
| --bg | oklch(0.165 0.012 240) | 近黑冷底 |
| --surface-1 | oklch(0.205 0.014 240) | 面板 |
| --surface-2 | oklch(0.245 0.016 240) | 次级面 |
| --border | oklch(0.32 0.018 240) | 描边 |
| --text-hi | oklch(0.96 0.01 230) | 主文本 |
| --text-mid | oklch(0.74 0.014 235) | 次文本 |
| --text-low | oklch(0.58 0.014 240) | 弱文本 |
| --accent（phosphor lime）| oklch(0.86 0.20 132) | 主强调/激活 |
| --accent-amber | oklch(0.80 0.16 75) | 次信号 |
| --info-cyan | oklch(0.78 0.13 200) | 信息 |
| --danger | oklch(0.66 0.20 25) | 危险 |

## 记忆点（signature）
1. **发光状态场**：状态 pill 用 accent 低透明 box-shadow 形成柔光晕（active=lime、cooldown=amber、invalid=danger）。
2. **信号网格背景**：极淡点阵 radial-gradient 铺底，营造仪表盘氛围。
3. **仪表读数式 KPI**：大号 tabular 数字 + mono 标签 + 迷你 sparkline。
4. **扫描载入动效**：页面载入时一条极淡的水平光带扫过（一次性，克制）。

## 形态语言
- 半径小而脆（--radius 6px / sm 4px），不圆润。
- 阴影改为"深度 + 极淡描边发光"，去掉霓虹。
- 间距 8px 栅格沿用。
- 动效：120/220/320ms，ease，载入用 staggered animation-delay。

## 契约
覆盖组件实际使用的语义 class（appFrame/sidebar/nav/card/kpiCard/metricsCard/btn/badge/pill/table/tabs/input/select/dialog/drawer/toast/skeleton/emptyState/errorBanner/pagination/credits*/keyReveal/onboarding/playground/json-viewer 等）+ 一个小型工具类层（flex/grid/gap-*/text-*/p-*）。保持 [data-theme] 钩子（默认 dark）。

## 范围
M3 交付：fonts（index.html）+ 全新 styles.css（Phosphor Ops）。M4 逐页精修。

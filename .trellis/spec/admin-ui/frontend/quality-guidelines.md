# Quality Guidelines

> Code quality standards for frontend development.

---

## Overview

<!--
Document your project's quality standards here.

Questions to answer:
- What patterns are forbidden?
- What linting rules do you enforce?
- What are your testing requirements?
- What code review standards apply?
-->

(To be filled by the team)

---

## Forbidden Patterns

<!-- Patterns that should never be used and why -->

(To be filled by the team)

---

## Required Patterns

<!-- Patterns that must always be used -->

### 模式：承载可溢出内容的 flex/grid 子元素必须设 `min-width: 0`

**问题**：grid 轨道（`1fr`）或 flex item 的默认最小尺寸等于其内容的
**min-content** 宽度。当子元素渲染一条不可断行的长内容时——代码/JSON 查看器
（`<pre>`）、长 URL/token 字符串、宽数据表——它的 min-content 宽度非常大，轨道
拒绝收缩到该宽度以下，于是该 item（往往连同整个面板）撑破视口。子元素自身的
`overflow: auto` 不会生效，因为父级是「长大去容纳它」而不是「约束它」。在多列
grid 中，这还会把同级列挤到几乎没有宽度。

**解法**：从轨道一路到滚动容器，沿途每个 flex/grid 后代都设 `min-width: 0`。
这样轨道解析为 `minmax(0, 1fr)`，可以收缩到内容尺寸以下，把控制权交还给子元素的
`overflow`。对文本查看器，再配合软换行，让内容自上而下阅读，而不是藏在横向滚动条
后面。

**示例**（来自 `src/styles/pages/playground.css` —— 双栏 Playground）：

```css
/* grid item + 其 flex body：允许 1fr 轨道收缩 */
.page-playground .playground-panel,
.page-playground .playground-panel-body {
  min-width: 0;            /* 没有这行，长 JSON 面板会撑破外壳 */
}

/* 滚动容器本身 */
.page-playground .json-viewer {
  min-width: 0;
  overflow: auto;          /* 在受约束的面板内纵向滚动 */
  white-space: pre-wrap;   /* 长行换行；缩进保留 */
  overflow-wrap: anywhere; /* 断开单个不可断的 token（如长 URL） */
}
```

**为什么**：`min-width: 0` 是 flex/grid「min-content 撑破」的标准解法。
单用 `white-space: pre` 会在长行上溢出；`pre-wrap` 在空白处换行，但单个长 token
仍会溢出——`overflow-wrap: anywhere` 兜住这种极端情况。三者合起来保证任何断点下都
不出现横向溢出。

**相关**：在窄宽度（≤390px）下验证，不可断字符串最先在此撑破；CSS 规则保持
作用域在页面根（`.page-<x>`）下，遵循 `DESIGN.md` 的 CSS 架构。

---

## Testing Requirements

<!-- What level of testing is expected -->

(To be filled by the team)

---

## Code Review Checklist

<!-- What reviewers should check -->

(To be filled by the team)

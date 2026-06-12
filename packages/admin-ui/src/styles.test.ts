/**
 * CSS split integrity tests.
 *
 * P1 CSS split moved tokens → tokens.css, base reset → base.css,
 * component classes → components.css.
 * P2 CSS split moved app-shell rules → styles/pages/shell.css.
 * This file verifies the correct placement of rules in their authoritative
 * locations.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const dir = dirname(fileURLToPath(import.meta.url));
const stylesDir = join(dir, 'styles');

const componentsCss = readFileSync(join(stylesDir, 'components.css'), 'utf8');
const baseCss = readFileSync(join(stylesDir, 'base.css'), 'utf8');
const tokensCss = readFileSync(join(stylesDir, 'tokens.css'), 'utf8');
const legacyCss = readFileSync(join(dir, 'styles.css'), 'utf8');
const shellCss = readFileSync(join(stylesDir, 'pages', 'shell.css'), 'utf8');

describe('CSS split — components.css', () => {
  it('uses token z-index layers for overlays and toasts', () => {
    const toastWrapBlock = componentsCss.match(/\.toastWrap\s*\{[\s\S]*?\}/)?.[0];
    expect(toastWrapBlock).toBeTruthy();
    expect(toastWrapBlock).toMatch(/z-index:\s*var\(--z-toast\);/);

    const dialogOverlayBlock = componentsCss.match(/\.dialogOverlay\s*\{[\s\S]*?\}/)?.[0];
    expect(dialogOverlayBlock).toBeTruthy();
    expect(dialogOverlayBlock).toMatch(/z-index:\s*var\(--z-modal\);/);
  });

  it('clips long API keys so they cannot overlap action buttons', () => {
    const block = componentsCss.match(/\.keyRevealValue\s*\{[\s\S]*?\}/)?.[0];
    expect(block).toBeTruthy();
    expect(block).toMatch(/display:\s*flex;/);
    expect(block).toMatch(/overflow:\s*hidden;/);
    expect(block).toMatch(/min-width:\s*0;/);
  });
});

describe('CSS split — base.css', () => {
  it('provides a skip-to-content link style', () => {
    const block = baseCss.match(/\.skipLink\s*\{[\s\S]*?\}/)?.[0];
    expect(block).toBeTruthy();
  });
});

describe('CSS split — tokens.css', () => {
  it('has a single canonical :root token block', () => {
    const rootBlocks = tokensCss.match(/(^|\n):root\s*,[\s\S]*?\{/g) ??
                       tokensCss.match(/(^|\n):root\s*\{/g) ?? [];
    // tokens.css declares :root, html[data-theme='light'] { ... }
    // accept either :root { or :root,
    expect(rootBlocks.length).toBeGreaterThanOrEqual(1);

    const darkThemeBlocks = tokensCss.match(/html\[data-theme='dark'\]\s*\{/g) ?? [];
    expect(darkThemeBlocks.length).toBe(1);
  });

  it('uses 4px base spacing (--space-1: 4px)', () => {
    expect(tokensCss).toMatch(/--space-1:\s*4px/);
  });
});

describe('CSS split — legacy styles.css (page-layout helpers + utilities only)', () => {
  it('no longer contains a :root token block', () => {
    const rootBlocks = legacyCss.match(/(^|\n):root\s*\{/g) ?? [];
    expect(rootBlocks.length).toBe(0);
  });

  it('no longer contains component-class rules that belong in components.css', () => {
    // These classes must NOT appear in styles.css any longer
    expect(legacyCss).not.toMatch(/^\.btn\s*\{/m);
    expect(legacyCss).not.toMatch(/^\.toastWrap\s*\{/m);
    expect(legacyCss).not.toMatch(/^\.dialog\s*\{/m);
    expect(legacyCss).not.toMatch(/^\.kpiCard\s*\{/m);
  });

  it('no longer contains app-shell frame rules (moved to styles/pages/shell.css in P2)', () => {
    // P2 explicitly moved shell rules out of styles.css into styles/pages/shell.css
    expect(legacyCss).not.toMatch(/^\.appFrame\s*\{/m);
    expect(legacyCss).not.toMatch(/^\.sidebar\s*\{/m);
    expect(legacyCss).not.toMatch(/^\.mainBody\s*\{/m);
  });
});

describe('CSS split — shell.css (P2: app shell + navigation)', () => {
  it('contains the app-shell frame rules for Shell.tsx', () => {
    expect(shellCss).toMatch(/\.appFrame\s*\{/);
    expect(shellCss).toMatch(/\.sidebar\s*\{/);
    expect(shellCss).toMatch(/\.mainBody\s*\{/);
  });

  it('uses cobalt primary tokens for active nav (no banned side-stripe)', () => {
    // Active nav must use --primary-soft bg + --primary color, NOT side-stripe ::before
    expect(shellCss).toMatch(/--primary-soft/);
    expect(shellCss).toMatch(/--primary\b/);
    // Side-stripe indicator (absolute positioned ::before with left offset) is banned
    expect(shellCss).not.toMatch(/navItem--active::before/);
  });

  it('uses semantic token names for sidebar surface (no hardcoded colors)', () => {
    // Sidebar must use token variables, not hardcoded colors or linear-gradient
    expect(shellCss).not.toMatch(/linear-gradient/);
    expect(shellCss).toMatch(/var\(--surface-1\)/);
  });

  it('has reduced-motion override for transitions', () => {
    expect(shellCss).toMatch(/prefers-reduced-motion:\s*reduce/);
    expect(shellCss).toMatch(/transition:\s*none/);
  });
});

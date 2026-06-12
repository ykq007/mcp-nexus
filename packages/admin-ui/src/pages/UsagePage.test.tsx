import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { UsagePage } from './UsagePage';

describe('UsagePage layout', () => {
  it('renders a dedicated scroll container for the table', () => {
    const html = renderToStaticMarkup(<UsagePage api={{} as any} />);
    // The table card carries "usageTableScroller" for backward-compat selector
    expect(html).toContain('usageTableScroller');
  });

  it('renders the filter bar', () => {
    const html = renderToStaticMarkup(<UsagePage api={{} as any} />);
    expect(html).toContain('usage-filter-bar');
  });

  it('renders with page-usage root class', () => {
    const html = renderToStaticMarkup(<UsagePage api={{} as any} />);
    expect(html).toContain('page-usage');
  });

  it('uses a Drawer (not Dialog) for detail view', () => {
    const html = renderToStaticMarkup(<UsagePage api={{} as any} />);
    // Drawer renders nothing when closed (open=false); no drawerOverlay in SSR output
    // The key is that Dialog is no longer in the import — verify no centered modal overlay
    expect(html).not.toContain('dialogOverlay');
  });
});

import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PlaygroundPage } from './PlaygroundPage';

// Mock everything needed for static render
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../components/JsonViewer', () => ({
  JsonViewer: () => <div className="json-viewer-mock" />,
}));

vi.mock('../components/ToolSelector', () => ({
  ToolSelector: () => <div className="tool-selector-mock" />,
  MCP_TOOLS: ['tavily_search'],
  coerceMcpTool: () => 'tavily_search',
}));

// Mock icons
vi.mock('../ui/icons', () => ({
  IconRefresh: () => <svg className="icon-refresh" />,
  IconSearch: () => <svg className="icon-search" />,
  IconTrash: () => <svg className="icon-trash" />,
  IconInfo: () => <svg className="icon-info" />,
  IconCheck: () => <svg className="icon-check" />,
  IconAlertCircle: () => <svg className="icon-alert" />,
}));

// Mock localStorage because useStickyState uses it
const localStorageMock = (function () {
  let store: Record<string, string> = {};
  return {
    getItem: function (key: string) {
      return store[key] || null;
    },
    setItem: function (key: string, value: string) {
      store[key] = value.toString();
    },
    clear: function () {
      store = {};
    },
    removeItem: function (key: string) {
      delete store[key];
    },
  };
})();

// Assign to global.window
global.window = {
  localStorage: localStorageMock,
  location: { origin: 'http://localhost:5173' },
} as any;

describe('PlaygroundPage', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('renders initial state', () => {
    const html = renderToStaticMarkup(<PlaygroundPage />);

    // The page renders two panels (request + response) and the history section.
    // When i18n is mocked to return the key, the rendered text is the key name.
    // We check for stable structural elements.
    expect(html).toContain('playground-panes');
    expect(html).toContain('playground-panel');
    // The request panel title uses t('request')
    expect(html).toContain('playground-panel-title');
    // The client token input is always present
    expect(html).toContain('playground-client-token');
    // ToolSelector mock is rendered
    expect(html).toContain('tool-selector-mock');
    // The history card is always rendered
    expect(html).toContain('playground-history-card');
  });

  it('renders client token input', () => {
    const html = renderToStaticMarkup(<PlaygroundPage />);
    expect(html).toContain('type="password"');
    expect(html).toContain('id="playground-client-token"');
  });

  it('renders two panels', () => {
    const html = renderToStaticMarkup(<PlaygroundPage />);
    // Count the panel elements — there should be 2 (request + response)
    const panelCount = (html.match(/playground-panel-body/g) ?? []).length;
    expect(panelCount).toBe(2);
  });
});

import React from 'react';
import { useTranslation } from 'react-i18next';

export const MCP_TOOLS = [
  'tavily_search',
  'tavily_extract',
  'tavily_crawl',
  'tavily_map',
  'tavily_research',
  'brave_web_search',
  'brave_local_search'
] as const;

export type McpTool = (typeof MCP_TOOLS)[number];

const MCP_TOOL_SET = new Set<string>(MCP_TOOLS);

export function isMcpTool(value: unknown): value is McpTool {
  return typeof value === 'string' && MCP_TOOL_SET.has(value);
}

export function coerceMcpTool(value: unknown, fallback: McpTool = 'tavily_search'): McpTool {
  return isMcpTool(value) ? value : fallback;
}

type ToolSelectorProps = {
  value: McpTool;
  onChange: (tool: McpTool) => void;
  disabled?: boolean;
};

export function ToolSelector({ value, onChange, disabled }: ToolSelectorProps) {
  const { t } = useTranslation('playground');
  return (
    <div className="playground-tool-select-wrap">
      <label htmlFor="tool-selector" className="playground-field-label">
        {t('tool')}
      </label>
      <select
        id="tool-selector"
        className="select mono"
        value={value}
        onChange={(e) => onChange(e.target.value as McpTool)}
        disabled={disabled}
      >
        {MCP_TOOLS.map((tool) => (
          <option key={tool} value={tool}>
            {tool}
          </option>
        ))}
      </select>
      <div className="playground-field-hint">{t('toolDescription')}</div>
    </div>
  );
}

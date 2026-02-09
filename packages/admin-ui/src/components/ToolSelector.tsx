import React from 'react';

export const MCP_TOOLS = [
  'tavily_search',
  'brave_web_search',
  'brave_news_search',
  'brave_local_search'
] as const;

export type McpTool = (typeof MCP_TOOLS)[number];

type ToolSelectorProps = {
  value: McpTool;
  onChange: (tool: McpTool) => void;
  disabled?: boolean;
};

export function ToolSelector({ value, onChange, disabled }: ToolSelectorProps) {
  return (
    <div className="stack gap-1">
      <label htmlFor="tool-selector" className="label">
        Tool
      </label>
      <select
        id="tool-selector"
        className="select"
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
      <div className="help">Select the MCP tool to execute.</div>
    </div>
  );
}

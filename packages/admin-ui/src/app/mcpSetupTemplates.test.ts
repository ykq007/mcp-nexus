import { describe, expect, it } from 'vitest';
import { MCP_SETUP_TARGETS, resolveMcpBaseUrl, resolveMcpUrl } from './mcpSetupTemplates';

describe('mcpSetupTemplates', () => {
  it('resolves /mcp from origin when apiBaseUrl is empty', () => {
    expect(resolveMcpUrl({ apiBaseUrl: '', origin: 'http://localhost:8787' })).toBe('http://localhost:8787/mcp');
  });

  it('normalizes apiBaseUrl and appends /mcp', () => {
    expect(resolveMcpUrl({ apiBaseUrl: 'http://127.0.0.1:8787/', origin: 'http://ignored' })).toBe('http://127.0.0.1:8787/mcp');
  });

  it('falls back to /mcp when origin is unavailable', () => {
    expect(resolveMcpUrl({ apiBaseUrl: '', origin: '' })).toBe('/mcp');
  });

  it('resolves base URL without appending /mcp', () => {
    expect(resolveMcpBaseUrl({ apiBaseUrl: 'http://127.0.0.1:8787/', origin: '' })).toBe('http://127.0.0.1:8787');
  });

  it('renders placeholder token when client token is empty', () => {
    const target = MCP_SETUP_TARGETS.find((t) => t.id === 'http-generic')!;
    const snippet = target.render({ apiBaseUrl: 'http://localhost:8787', origin: '', clientToken: '' });
    expect(snippet).toContain('<YOUR_CLIENT_TOKEN>');
    expect(snippet).toContain('/mcp');
  });

  it('includes TAVILY_BRIDGE_MCP_TOKEN in stdio snippets', () => {
    const target = MCP_SETUP_TARGETS.find((t) => t.id === 'stdio-generic')!;
    const snippet = target.render({ apiBaseUrl: '', origin: '', clientToken: 'mcp_x.y' });
    expect(snippet).toContain('TAVILY_BRIDGE_MCP_TOKEN');
    expect(snippet).toContain('mcp_x.y');
  });

  it('renders an npx-based stdio wrapper snippet', () => {
    const target = MCP_SETUP_TARGETS.find((t) => t.id === 'claude-desktop-npx')!;
    const snippet = target.render({ apiBaseUrl: 'http://localhost:8787/', origin: '', clientToken: 'mcp_x.y' });
    expect(snippet).toContain('"command": "npx"');
    expect(snippet).toContain('@nexus-mcp/stdio-http-bridge');
    expect(snippet).toContain('http://localhost:8787');
    expect(snippet).toContain('mcp_x.y');
    expect(snippet).toContain('TAVILY_BRIDGE_BASE_URL');
    expect(snippet).toContain('TAVILY_BRIDGE_MCP_TOKEN');
  });

  it('renders a claude code CLI command using the stdio npx wrapper with env auth (no header / no OAuth)', () => {
    const target = MCP_SETUP_TARGETS.find((t) => t.id === 'claude-code-cli')!;
    const snippet = target.render({ apiBaseUrl: 'http://localhost:8787', origin: '', clientToken: 'mcp_x.y' });
    expect(snippet).toContain('claude mcp add tavily-bridge');
    expect(snippet).toContain('@nexus-mcp/stdio-http-bridge');
    expect(snippet).toContain('TAVILY_BRIDGE_BASE_URL=http://localhost:8787');
    expect(snippet).toContain('TAVILY_BRIDGE_MCP_TOKEN=mcp_x.y');
    // Bridge base URL only — the wrapper appends /mcp, and no bearer header is used.
    expect(snippet).not.toContain('http://localhost:8787/mcp');
    expect(snippet).not.toContain('--transport http');
    expect(snippet).not.toContain('Authorization: Bearer');
  });

  it('renders a codex config.toml entry using the npx wrapper and base url', () => {
    const target = MCP_SETUP_TARGETS.find((t) => t.id === 'codex-cli')!;
    const snippet = target.render({ apiBaseUrl: 'http://localhost:8787/', origin: '', clientToken: 'mcp_x.y' });
    expect(snippet).toContain('[mcp_servers.tavily-bridge]');
    expect(snippet).toContain('@nexus-mcp/stdio-http-bridge');
    expect(snippet).toContain('TAVILY_BRIDGE_BASE_URL = "http://localhost:8787"');
    expect(snippet).toContain('TAVILY_BRIDGE_MCP_TOKEN = "mcp_x.y"');
    expect(snippet).not.toContain('http://localhost:8787/mcp');
  });

  it('renders a cursor mcp.json entry with url + headers', () => {
    const target = MCP_SETUP_TARGETS.find((t) => t.id === 'cursor')!;
    const snippet = target.render({ apiBaseUrl: 'http://localhost:8787', origin: '', clientToken: 'mcp_x.y' });
    expect(snippet).toContain('"mcpServers"');
    expect(snippet).toContain('"url": "http://localhost:8787/mcp"');
    expect(snippet).toContain('"Authorization": "Bearer mcp_x.y"');
  });

  it('renders a vscode mcp.json entry with type http', () => {
    const target = MCP_SETUP_TARGETS.find((t) => t.id === 'vscode')!;
    const snippet = target.render({ apiBaseUrl: 'http://localhost:8787', origin: '', clientToken: 'mcp_x.y' });
    expect(snippet).toContain('"servers"');
    expect(snippet).toContain('"type": "http"');
    expect(snippet).toContain('"url": "http://localhost:8787/mcp"');
    expect(snippet).toContain('"Authorization": "Bearer mcp_x.y"');
  });

  it('renders a gemini settings.json entry with httpUrl', () => {
    const target = MCP_SETUP_TARGETS.find((t) => t.id === 'gemini-cli')!;
    const snippet = target.render({ apiBaseUrl: 'http://localhost:8787', origin: '', clientToken: 'mcp_x.y' });
    expect(snippet).toContain('"mcpServers"');
    expect(snippet).toContain('"httpUrl": "http://localhost:8787/mcp"');
    expect(snippet).toContain('"Authorization": "Bearer mcp_x.y"');
  });

  it('exposes a placeholder for every target when token + base url are empty', () => {
    for (const target of MCP_SETUP_TARGETS) {
      const snippet = target.render({ apiBaseUrl: '', origin: '', clientToken: '' });
      expect(snippet).toContain('<YOUR_CLIENT_TOKEN>');
    }
  });
});

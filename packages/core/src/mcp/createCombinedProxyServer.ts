import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema, ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import type { TavilyClient, TavilyDefaultParametersProvider } from '../tavily/types.js';
import { tavilyToolsV0216 } from '../tavily/tools-v0216.js';
import {
  formatCrawlResultsV0216,
  formatMapResultsV0216,
  formatResearchResultsV0216,
  formatResultsV0216
} from '../tavily/format-v0216.js';
import { TavilyHttpError, isTavilyHttpError } from '../tavily/errors.js';

import type { BraveClient } from '../brave/types.js';
import { braveToolsV0100 } from '../brave/tools-v0100.js';
import { formatBraveLocalResultsV0100, formatBraveWebResultsFromTavilyV0100, formatBraveWebResultsV0100 } from '../brave/format-v0100.js';
import { BraveHttpError, isBraveHttpError, isBraveRateGateTimeoutError } from '../brave/errors.js';

import type { SearchSourceMode } from './searchSource.js';

export type BraveOverflowMode = 'queue' | 'error' | 'fallback_to_tavily';

export type SearchSourceModeProvider = (ctx: unknown) => SearchSourceMode | Promise<SearchSourceMode>;

type CreateCombinedProxyServerOptions = {
  serverName: string;
  serverVersion: string;
  tavilyClient: TavilyClient;
  braveClient?: BraveClient;
  braveOverflow?: BraveOverflowMode;
  braveMaxQueueMs?: number;
  getDefaultParameters?: TavilyDefaultParametersProvider;
  getAuthToken?: (ctx: unknown) => string | undefined;
  getSearchSourceMode?: SearchSourceModeProvider;
};

export function createCombinedProxyServer({
  serverName,
  serverVersion,
  tavilyClient,
  braveClient,
  braveOverflow = 'fallback_to_tavily',
  braveMaxQueueMs = 30_000,
  getDefaultParameters,
  getAuthToken,
  getSearchSourceMode
}: CreateCombinedProxyServerOptions): Server {
  const server = new Server(
    { name: serverName, version: serverVersion },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: [...tavilyToolsV0216, ...braveToolsV0100] };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    const token = getAuthToken?.(extra) ?? (extra as any)?.authInfo?.token;
    if (!token) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'Client token is required. Provide Authorization: Bearer <token> (HTTP) or set TAVILY_BRIDGE_MCP_TOKEN (stdio).'
      );
    }

    const args = request.params.arguments ?? {};
    const toolName = request.params.name;

    try {
      switch (toolName) {
        case 'tavily_search': {
          const defaults = getDefaultParameters?.(extra) ?? {};
          const country = (args as any).country;
          const normalizedArgs = {
            ...args,
            ...(country ? { topic: 'general' } : null)
          } as any;

          const response = await tavilyClient.search(normalizedArgs, { defaults });
          return textResult(formatResultsV0216(response));
        }
        case 'tavily_extract': {
          const response = await tavilyClient.extract(args as any);
          return textResult(formatResultsV0216(response));
        }
        case 'tavily_crawl': {
          const response = await tavilyClient.crawl(args as any);
          return textResult(formatCrawlResultsV0216(response));
        }
        case 'tavily_map': {
          const response = await tavilyClient.map(args as any);
          return textResult(formatMapResultsV0216(response));
        }
        case 'tavily_research': {
          const response = await tavilyClient.research(args as any);
          return textResult(formatResearchResultsV0216(response));
        }
        case 'brave_web_search': {
          const searchSourceMode = await getSearchSourceMode?.(extra) ?? 'brave_prefer_tavily_fallback';
          return await handleBraveWebSearch({
            args,
            extra,
            tavilyClient,
            braveClient,
            braveOverflow,
            braveMaxQueueMs,
            getDefaultParameters,
            searchSourceMode
          });
        }
        case 'brave_local_search': {
          const searchSourceMode = await getSearchSourceMode?.(extra) ?? 'brave_prefer_tavily_fallback';
          return await handleBraveLocalSearch({
            args,
            extra,
            tavilyClient,
            braveClient,
            braveOverflow,
            braveMaxQueueMs,
            getDefaultParameters,
            searchSourceMode
          });
        }
        default:
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${toolName}`);
      }
    } catch (error) {
      if (isTavilyHttpError(error)) {
        return toolError(`Tavily API error: ${(error as TavilyHttpError).tavilyMessage ?? error.message}`);
      }
      if (isBraveHttpError(error)) {
        const details = (error as BraveHttpError).braveMessage ?? error.message;
        return toolError(`Brave API error: ${details}`);
      }
      throw error;
    }
  });

  return server;
}

async function handleBraveWebSearch(opts: {
  args: Record<string, unknown>;
  extra: unknown;
  tavilyClient: TavilyClient;
  braveClient: BraveClient | undefined;
  braveOverflow: BraveOverflowMode;
  braveMaxQueueMs: number;
  getDefaultParameters: TavilyDefaultParametersProvider | undefined;
  searchSourceMode: SearchSourceMode;
}): Promise<CallToolResult> {
  const defaults = opts.getDefaultParameters?.(opts.extra) ?? {};
  const query = typeof (opts.args as any).query === 'string' ? String((opts.args as any).query) : '';
  const maxResults = typeof (opts.args as any).count === 'number' ? (opts.args as any).count : undefined;

  // Handle tavily_only mode
  if (opts.searchSourceMode === 'tavily_only') {
    const response = await opts.tavilyClient.search({ query, max_results: maxResults }, { defaults });
    return textResult(formatBraveWebResultsFromTavilyV0100(response));
  }

  // Handle brave_only mode
  if (opts.searchSourceMode === 'brave_only') {
    if (!opts.braveClient) {
      return toolError('Brave Search is not configured. Please add a Brave API key or change the search source mode.');
    }
    const maxWaitMs = resolveBraveMaxWaitMs(opts.braveOverflow, opts.braveMaxQueueMs);
    const response = await opts.braveClient.webSearch(opts.args as any, { defaults, maxWaitMs });
    return textResult(formatBraveWebResultsV0100(response));
  }

  // Handle combined mode - call both in parallel and dedupe
  if (opts.searchSourceMode === 'combined') {
    return await handleCombinedWebSearch(opts, query, maxResults, defaults);
  }

  // Default: brave_prefer_tavily_fallback (original behavior)
  if (!opts.braveClient) {
    const response = await opts.tavilyClient.search({ query, max_results: maxResults }, { defaults });
    return textResult(formatBraveWebResultsFromTavilyV0100(response));
  }

  const maxWaitMs = resolveBraveMaxWaitMs(opts.braveOverflow, opts.braveMaxQueueMs);

  try {
    const response = await opts.braveClient.webSearch(opts.args as any, { defaults, maxWaitMs });
    return textResult(formatBraveWebResultsV0100(response));
  } catch (err: unknown) {
    if (opts.braveOverflow === 'fallback_to_tavily' && (isBraveRateGateTimeoutError(err) || isBraveHttpError(err))) {
      const response = await opts.tavilyClient.search({ query, max_results: maxResults }, { defaults });
      return textResult(formatBraveWebResultsFromTavilyV0100(response));
    }
    if (isBraveRateGateTimeoutError(err)) {
      return toolError(`Brave API error: request queued too long (maxWaitMs=${opts.braveMaxQueueMs})`);
    }
    throw err;
  }
}

async function handleCombinedWebSearch(
  opts: {
    tavilyClient: TavilyClient;
    braveClient: BraveClient | undefined;
    braveMaxQueueMs: number;
    braveOverflow: BraveOverflowMode;
    args: Record<string, unknown>;
    getDefaultParameters: TavilyDefaultParametersProvider | undefined;
    extra: unknown;
  },
  query: string,
  maxResults: number | undefined,
  defaults: Record<string, unknown>
): Promise<CallToolResult> {
  const promises: Promise<{ source: 'tavily' | 'brave'; results: any[] }>[] = [];

  // Always call Tavily
  promises.push(
    opts.tavilyClient.search({ query, max_results: maxResults }, { defaults })
      .then(res => ({ source: 'tavily' as const, results: res.results ?? [] }))
      .catch(() => ({ source: 'tavily' as const, results: [] }))
  );

  // Call Brave if available
  if (opts.braveClient) {
    const maxWaitMs = resolveBraveMaxWaitMs(opts.braveOverflow, opts.braveMaxQueueMs);
    promises.push(
      opts.braveClient.webSearch(opts.args as any, { defaults, maxWaitMs })
        .then(res => {
          const webResults = (res as any)?.web?.results ?? (res as any)?.results ?? [];
          return { source: 'brave' as const, results: webResults };
        })
        .catch(() => ({ source: 'brave' as const, results: [] }))
    );
  }

  const settled = await Promise.all(promises);

  // Merge and deduplicate by URL
  const seenUrls = new Set<string>();
  const merged: Array<{ title: string; url: string; description?: string }> = [];

  for (const { source, results } of settled) {
    for (const r of results) {
      const url = String(r?.url ?? '');
      if (!url || seenUrls.has(url)) continue;
      seenUrls.add(url);
      merged.push({
        title: String(r?.title ?? ''),
        url,
        description: String(r?.content ?? r?.description ?? r?.snippet ?? '') || undefined
      });
    }
  }

  return textResult(JSON.stringify(merged, null, 2));
}

async function handleBraveLocalSearch(opts: {
  args: Record<string, unknown>;
  extra: unknown;
  tavilyClient: TavilyClient;
  braveClient: BraveClient | undefined;
  braveOverflow: BraveOverflowMode;
  braveMaxQueueMs: number;
  getDefaultParameters: TavilyDefaultParametersProvider | undefined;
  searchSourceMode: SearchSourceMode;
}): Promise<CallToolResult> {
  const defaults = opts.getDefaultParameters?.(opts.extra) ?? {};
  const query = typeof (opts.args as any).query === 'string' ? String((opts.args as any).query) : '';
  const maxResults = typeof (opts.args as any).count === 'number' ? (opts.args as any).count : undefined;

  // Handle tavily_only mode
  if (opts.searchSourceMode === 'tavily_only') {
    const response = await opts.tavilyClient.search({ query, max_results: maxResults }, { defaults });
    return textResult(formatBraveWebResultsFromTavilyV0100(response));
  }

  // Handle brave_only mode
  if (opts.searchSourceMode === 'brave_only') {
    if (!opts.braveClient) {
      return toolError('Brave Search is not configured. Please add a Brave API key or change the search source mode.');
    }
    const maxWaitMs = resolveBraveMaxWaitMs(opts.braveOverflow, opts.braveMaxQueueMs);
    const response = await opts.braveClient.localSearch(opts.args as any, { defaults, maxWaitMs });
    return textResult(formatBraveLocalResultsV0100(response));
  }

  // Handle combined mode - call both in parallel and dedupe
  if (opts.searchSourceMode === 'combined') {
    return await handleCombinedLocalSearch(opts, query, maxResults, defaults);
  }

  // Default: brave_prefer_tavily_fallback (original behavior)
  if (!opts.braveClient) {
    const response = await opts.tavilyClient.search({ query, max_results: maxResults }, { defaults });
    return textResult(formatBraveWebResultsFromTavilyV0100(response));
  }

  const maxWaitMs = resolveBraveMaxWaitMs(opts.braveOverflow, opts.braveMaxQueueMs);

  try {
    const response = await opts.braveClient.localSearch(opts.args as any, { defaults, maxWaitMs });
    return textResult(formatBraveLocalResultsV0100(response));
  } catch (err: unknown) {
    if (opts.braveOverflow === 'fallback_to_tavily' && (isBraveRateGateTimeoutError(err) || isBraveHttpError(err))) {
      const response = await opts.tavilyClient.search({ query, max_results: maxResults }, { defaults });
      return textResult(formatBraveWebResultsFromTavilyV0100(response));
    }
    if (isBraveRateGateTimeoutError(err)) {
      return toolError(`Brave API error: request queued too long (maxWaitMs=${opts.braveMaxQueueMs})`);
    }
    throw err;
  }
}

async function handleCombinedLocalSearch(
  opts: {
    tavilyClient: TavilyClient;
    braveClient: BraveClient | undefined;
    braveMaxQueueMs: number;
    braveOverflow: BraveOverflowMode;
    args: Record<string, unknown>;
    getDefaultParameters: TavilyDefaultParametersProvider | undefined;
    extra: unknown;
  },
  query: string,
  maxResults: number | undefined,
  defaults: Record<string, unknown>
): Promise<CallToolResult> {
  const promises: Promise<{ source: 'tavily' | 'brave'; results: any[] }>[] = [];

  // Always call Tavily
  promises.push(
    opts.tavilyClient.search({ query, max_results: maxResults }, { defaults })
      .then(res => ({ source: 'tavily' as const, results: res.results ?? [] }))
      .catch(() => ({ source: 'tavily' as const, results: [] }))
  );

  // Call Brave local search if available
  if (opts.braveClient) {
    const maxWaitMs = resolveBraveMaxWaitMs(opts.braveOverflow, opts.braveMaxQueueMs);
    promises.push(
      opts.braveClient.localSearch(opts.args as any, { defaults, maxWaitMs })
        .then(res => {
          const localResults = (res as any)?.local?.results ?? (res as any)?.results ?? (res as any)?.web?.results ?? [];
          return { source: 'brave' as const, results: localResults };
        })
        .catch(() => ({ source: 'brave' as const, results: [] }))
    );
  }

  const settled = await Promise.all(promises);

  // Merge and deduplicate by URL
  const seenUrls = new Set<string>();
  const merged: Array<{ title: string; url: string; description?: string }> = [];

  for (const { source, results } of settled) {
    for (const r of results) {
      const url = String(r?.url ?? r?.website ?? '');
      if (!url || seenUrls.has(url)) continue;
      seenUrls.add(url);
      merged.push({
        title: String(r?.title ?? r?.name ?? ''),
        url,
        description: String(r?.content ?? r?.description ?? r?.snippet ?? '') || undefined
      });
    }
  }

  return textResult(JSON.stringify(merged, null, 2));
}

function resolveBraveMaxWaitMs(mode: BraveOverflowMode, maxQueueMs: number): number | undefined {
  if (mode === 'queue') return maxQueueMs;
  if (mode === 'fallback_to_tavily') return maxQueueMs;
  if (mode === 'error') return 1;
  return maxQueueMs;
}

function textResult(text: string): CallToolResult {
  return {
    content: [{ type: 'text', text }]
  };
}

function toolError(text: string): CallToolResult {
  return {
    content: [{ type: 'text', text }],
    isError: true
  };
}

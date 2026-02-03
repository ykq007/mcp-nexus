/**
 * Tavily API HTTP client for Cloudflare Workers
 */

const TAVILY_API_BASE = 'https://api.tavily.com';

export interface TavilySearchResult {
  results: Array<{
    title: string;
    url: string;
    content: string;
    score: number;
    raw_content?: string;
  }>;
  query: string;
  answer?: string;
  images?: string[];
}

export interface TavilyExtractResult {
  results: Array<{
    url: string;
    raw_content: string;
  }>;
}

export interface TavilyCrawlResult {
  results: Array<{
    url: string;
    raw_content: string;
  }>;
}

export interface TavilyMapResult {
  urls: string[];
}

export interface TavilyResearchResult {
  answer: string;
  sources: Array<{
    title: string;
    url: string;
  }>;
}

export async function tavilySearch(
  apiKey: string,
  params: {
    query: string;
    search_depth?: 'basic' | 'advanced' | 'fast' | 'ultra-fast';
    max_results?: number;
    include_images?: boolean;
    include_raw_content?: boolean;
    topic?: string;
    include_domains?: string[];
    exclude_domains?: string[];
    time_range?: string;
    start_date?: string;
    end_date?: string;
    country?: string;
    include_image_descriptions?: boolean;
    include_favicon?: boolean;
  }
): Promise<TavilySearchResult> {
  const response = await fetch(`${TAVILY_API_BASE}/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(params)
  });

  return handleTavilyResponse(response);
}

export async function tavilyExtract(
  apiKey: string,
  params: {
    urls: string[];
    extract_depth?: 'basic' | 'advanced';
    format?: 'markdown' | 'text';
    query?: string;
    include_images?: boolean;
    include_favicon?: boolean;
  }
): Promise<TavilyExtractResult> {
  const response = await fetch(`${TAVILY_API_BASE}/extract`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(params)
  });

  return handleTavilyResponse(response);
}

export async function tavilyCrawl(
  apiKey: string,
  params: {
    url: string;
    max_depth?: number;
    max_breadth?: number;
    limit?: number;
    format?: 'markdown' | 'text';
    extract_depth?: 'basic' | 'advanced';
    instructions?: string;
    select_paths?: string[];
    select_domains?: string[];
    allow_external?: boolean;
    include_images?: boolean;
    include_favicon?: boolean;
  }
): Promise<TavilyCrawlResult> {
  const response = await fetch(`${TAVILY_API_BASE}/crawl`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(params)
  });

  return handleTavilyResponse(response);
}

export async function tavilyMap(
  apiKey: string,
  params: {
    url: string;
    max_depth?: number;
    max_breadth?: number;
    limit?: number;
    instructions?: string;
    select_paths?: string[];
    select_domains?: string[];
    allow_external?: boolean;
  }
): Promise<TavilyMapResult> {
  const response = await fetch(`${TAVILY_API_BASE}/map`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(params)
  });

  return handleTavilyResponse(response);
}

export async function tavilyResearch(
  apiKey: string,
  params: {
    input: string;
    model?: 'mini' | 'pro' | 'auto';
  }
): Promise<TavilyResearchResult> {
  const response = await fetch(`${TAVILY_API_BASE}/research`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(params)
  });

  return handleTavilyResponse(response);
}

async function handleTavilyResponse<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!response.ok) {
    if (response.status === 401) {
      throw new TavilyError('Invalid API key', response.status);
    }
    if (response.status === 429) {
      throw new TavilyError('Rate limit exceeded', response.status);
    }

    let message = response.statusText;
    try {
      const body = JSON.parse(text);
      if (body.message) message = body.message;
    } catch {}

    throw new TavilyError(message, response.status);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new TavilyError('Invalid JSON response', response.status);
  }
}

export class TavilyError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'TavilyError';
  }
}

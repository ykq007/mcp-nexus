import process from 'node:process';
import { parseArgs } from 'node:util';

import { runIssueDiscoverByPrompt, type DiscoveryDepth } from './issueDiscoverByPrompt.js';

type CliArgs = {
  prompt: string;
  scope: string;
  depth: DiscoveryDepth;
  maxIterations: number;
};

type ParseCliArgsResult = { ok: true; value: CliArgs } | { ok: false; exitCode: 1 | 2; error: string };

function parseCliArgs(argv: string[]): ParseCliArgsResult {
  const parsed = parseArgs({
    args: argv,
    strict: false,
    allowPositionals: true,
    options: {
      help: { type: 'boolean', short: 'h' },
      scope: { type: 'string' },
      depth: { type: 'string' },
      'max-iterations': { type: 'string' }
    }
  });

  if (parsed.values.help) {
    return { ok: false, exitCode: 2, error: usage() };
  }

  const prompt = parsed.positionals.join(' ').trim();
  if (!prompt) {
    return { ok: false, exitCode: 1, error: 'Missing prompt. Provide a prompt as positional args.' };
  }

  const scopeValue = typeof parsed.values.scope === 'string' ? parsed.values.scope.trim() : '';
  const scope = scopeValue || '**/*';

  const depthRaw = typeof parsed.values.depth === 'string' ? parsed.values.depth.trim().toLowerCase() : '';
  const depth: DiscoveryDepth = depthRaw === 'deep' ? 'deep' : 'standard';

  const maxIterRaw = typeof parsed.values['max-iterations'] === 'string' ? parsed.values['max-iterations'].trim() : '';
  const parsedMax = maxIterRaw ? Number(maxIterRaw) : 5;
  const maxIterations = Number.isFinite(parsedMax) && parsedMax > 0 ? Math.floor(parsedMax) : 5;

  return { ok: true, value: { prompt, scope, depth, maxIterations } };
}

function usage(): string {
  return [
    'Issue discovery by prompt (prompt-driven)',
    '',
    'Usage:',
    '  npm --workspace @mcp-nexus/bridge-server run issue-discover-by-prompt -- "<prompt>" [--scope <glob>] [--depth standard|deep] [--max-iterations N]',
    '',
    'Options:',
    '  --scope <glob>          File glob to explore (default: **/*).',
    '  --depth <standard|deep> standard = 3 iterations, deep = 5 iterations.',
    '  --max-iterations <N>    Max iterations (default: 5).',
    '  -h, --help              Show help.'
  ].join('\n');
}

async function main(): Promise<void> {
  const parsed = parseCliArgs(process.argv.slice(2));
  if (!parsed.ok) {
    console.error(parsed.error);
    process.exitCode = parsed.exitCode;
    return;
  }

  const summary = await runIssueDiscoverByPrompt(parsed.value);
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(message);
  process.exitCode = 1;
});


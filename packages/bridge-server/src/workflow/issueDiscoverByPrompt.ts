import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export type DiscoveryDepth = 'standard' | 'deep';
export type DiscoveryIntentType = 'comparison' | 'search' | 'verification' | 'audit';

export type DiscoveryDimension = {
  name: string;
  description: string;
  search_targets: string[];
  focus_areas: string[];
};

export type DiscoveryFinding = {
  id: string;
  title: string;
  category: string;
  file: string;
  line: number;
  snippet: string;
  related_dimension?: string;
  confidence: number;
};

export type DiscoveryIterationReport = {
  dimension: string;
  iteration: number;
  findings: DiscoveryFinding[];
  coverage: {
    files_explored: number;
    areas_covered: string[];
    areas_remaining: string[];
  };
  leads: Array<{ description: string; suggested_search?: string }>;
};

export type DiscoveryComparisonPoint = {
  aspect: string;
  frontend_check: string;
  backend_check: string;
};

export type DiscoveryPlan = {
  intent_analysis: {
    type: DiscoveryIntentType;
    primary_question: string;
    sub_questions: string[];
  };
  dimensions: DiscoveryDimension[];
  comparison_matrix?: {
    dimension_a: string;
    dimension_b: string;
    comparison_points: DiscoveryComparisonPoint[];
  };
  estimated_iterations: number;
  termination_conditions: string[];
};

export type DiscoveryState = {
  discovery_id: string;
  type: 'prompt-driven';
  prompt: string;
  intent_type: DiscoveryIntentType;
  phase: 'running' | 'complete';
  created_at: string;
  updated_at: string;
  scope: string;
  depth: DiscoveryDepth;
  max_iterations: number;
  plan: DiscoveryPlan;
  context: {
    prompt_keywords: string[];
    codebase_structure: {
      modules: string[];
      file_extensions: Record<string, number>;
    };
    relevant_modules: string[];
  };
  iterations: Array<{ number: number; findings_count: number; new_discoveries: number; confidence: number }>;
  results?: {
    total_iterations: number;
    total_findings: number;
    issues_generated: number;
    comparison_match_rate?: number;
  };
};

export type DiscoverySummary = {
  discovery_id: string;
  prompt: string;
  intent_type: DiscoveryIntentType;
  dimensions: string[];
  total_iterations: number;
  total_findings: number;
  issues_generated: number;
  comparison_match_rate?: number;
};

export type RunIssueDiscoverByPromptOptions = {
  prompt: string;
  scope?: string;
  depth?: DiscoveryDepth;
  maxIterations?: number;
  repoRoot?: string;
};

type RgMatch = {
  file: string;
  line: number;
  column?: number;
  text: string;
};

type ComparisonDiscrepancy = {
  type: string;
  frontend?: string;
  backend?: string;
};

const DEFAULT_SCOPE = '**/*';
const DEFAULT_DEPTH: DiscoveryDepth = 'standard';
const DEFAULT_MAX_ITERATIONS = 5;

const BASE_EXCLUDE_GLOBS = ['!**/node_modules/**', '!**/dist/**', '!**/coverage/**', '!**/.workflow/**', '!**/.tmp/**'];
const DBP_DEBUG = process.env.DBP_DEBUG === 'true';

const PROMPT_STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'audit',
  'backend',
  'between',
  'but',
  'by',
  'check',
  'compare',
  'ensure',
  'find',
  'for',
  'frontend',
  'from',
  'how',
  'if',
  'in',
  'into',
  'is',
  'it',
  'locate',
  'match',
  'of',
  'on',
  'or',
  'review',
  'search',
  'that',
  'the',
  'their',
  'then',
  'to',
  'verify',
  'versus',
  'vs',
  'where',
  'whether',
  'with'
]);

export function detectIntentType(prompt: string): DiscoveryIntentType {
  const normalized = prompt.toLowerCase();
  if (/(match|compare|versus|\bvs\b|between)/i.test(normalized)) return 'comparison';
  if (/(find|locate|where)/i.test(normalized)) return 'search';
  if (/(verify|check|ensure)/i.test(normalized)) return 'verification';
  return 'audit';
}

export function extractPromptKeywords(prompt: string): string[] {
  const tokens = prompt
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => t.length >= 3)
    .filter((t) => !PROMPT_STOPWORDS.has(t));

  const seen = new Set<string>();
  const unique: string[] = [];
  for (const token of tokens) {
    if (seen.has(token)) continue;
    seen.add(token);
    unique.push(token);
  }
  return unique.slice(0, 12);
}

export async function runIssueDiscoverByPrompt(options: RunIssueDiscoverByPromptOptions): Promise<DiscoverySummary> {
  const prompt = options.prompt.trim();
  if (!prompt) {
    throw new Error('Missing prompt. Provide a non-empty prompt string.');
  }

  const scope = options.scope?.trim() || DEFAULT_SCOPE;
  const depth = options.depth ?? DEFAULT_DEPTH;
  const maxIterations = options.maxIterations ?? DEFAULT_MAX_ITERATIONS;

  const repoRoot = options.repoRoot ? path.resolve(options.repoRoot) : await findRepoRoot(process.cwd());
  const createdAt = new Date().toISOString();
  const discoveryId = `DBP-${formatUtcTimestamp(new Date())}`;
  const outputDir = path.join(repoRoot, '.workflow', 'issues', 'discoveries', discoveryId);

  await fs.promises.mkdir(path.join(outputDir, 'iterations'), { recursive: true });

  const intentType = detectIntentType(prompt);
  const promptKeywords = extractPromptKeywords(prompt);

  const allFiles = await listFiles(repoRoot, scope);
  const codebaseStructure = summarizeCodebaseStructure(allFiles);
  const relevantModules = await findRelevantModules(repoRoot, scope, promptKeywords);

  const dimensions = deriveDimensions(prompt, intentType, allFiles);
  const plan = buildDiscoveryPlan(prompt, intentType, dimensions, depth);

  const initialState: DiscoveryState = {
    discovery_id: discoveryId,
    type: 'prompt-driven',
    prompt,
    intent_type: intentType,
    phase: 'running',
    created_at: createdAt,
    updated_at: createdAt,
    scope,
    depth,
    max_iterations: maxIterations,
    plan,
    context: {
      prompt_keywords: promptKeywords,
      codebase_structure: codebaseStructure,
      relevant_modules: relevantModules
    },
    iterations: []
  };

  await writeJson(path.join(outputDir, 'discovery-state.json'), initialState);

  const estimatedIterations = Math.min(plan.estimated_iterations, maxIterations);
  const cumulativeFindingKeys = new Set<string>();
  let totalFindings = 0;
  let actualIterations = 0;

  for (let iteration = 1; iteration <= estimatedIterations; iteration += 1) {
    const iterationDir = path.join(outputDir, 'iterations', String(iteration));
    await fs.promises.mkdir(iterationDir, { recursive: true });

    let newDiscoveriesThisIteration = 0;
    let findingsThisIteration = 0;

    for (const dim of dimensions) {
      const report = await exploreDimension({
        repoRoot,
        scope,
        iteration,
        dimension: dim,
        promptKeywords
      });

      for (const finding of report.findings) {
        const key = `${dim.name}:${finding.category}:${finding.file}:${finding.line}:${finding.title}`;
        if (cumulativeFindingKeys.has(key)) continue;
        cumulativeFindingKeys.add(key);
        newDiscoveriesThisIteration += 1;
      }

      findingsThisIteration += report.findings.length;
      await writeJson(path.join(iterationDir, `${sanitizeFileStem(dim.name)}.json`), report);
    }

    actualIterations = iteration;
    totalFindings = cumulativeFindingKeys.size;

    const confidence = calculateConfidence(totalFindings, actualIterations);
    initialState.iterations.push({
      number: iteration,
      findings_count: totalFindings,
      new_discoveries: newDiscoveriesThisIteration,
      confidence
    });

    initialState.updated_at = new Date().toISOString();
    await writeJson(path.join(outputDir, 'discovery-state.json'), initialState);

    if (newDiscoveriesThisIteration === 0) {
      break;
    }
  }

  // Comparison analysis (optional)
  let comparisonMatchRate: number | undefined;
  let issuesGenerated = 0;
  if (intentType === 'comparison' && dimensions.length >= 2) {
    const comparison = await runComparisonAnalysis({
      repoRoot,
      scope,
      plan,
      dimensions,
      outputDir
    });
    comparisonMatchRate = comparison.overallMatchRate;
    issuesGenerated = await writeIssuesFromComparison(outputDir, discoveryId, comparison);
  } else {
    await writeEmptyIssuesFile(outputDir);
  }

  initialState.phase = 'complete';
  initialState.updated_at = new Date().toISOString();
  initialState.results = {
    total_iterations: actualIterations,
    total_findings: totalFindings,
    issues_generated: issuesGenerated,
    ...(typeof comparisonMatchRate === 'number' ? { comparison_match_rate: comparisonMatchRate } : {})
  };
  await writeJson(path.join(outputDir, 'discovery-state.json'), initialState);

  const summary: DiscoverySummary = {
    discovery_id: discoveryId,
    prompt,
    intent_type: intentType,
    dimensions: dimensions.map((d) => d.name),
    total_iterations: actualIterations,
    total_findings: totalFindings,
    issues_generated: issuesGenerated,
    ...(typeof comparisonMatchRate === 'number' ? { comparison_match_rate: comparisonMatchRate } : {})
  };

  return summary;
}

function buildDiscoveryPlan(
  prompt: string,
  intentType: DiscoveryIntentType,
  dimensions: DiscoveryDimension[],
  depth: DiscoveryDepth
): DiscoveryPlan {
  const estimated = depth === 'deep' ? 5 : 3;

  const intentAnalysis = {
    type: intentType,
    primary_question: prompt.trim(),
    sub_questions: intentType === 'comparison' ? ['Are interfaces aligned?', 'Are payloads compatible?', 'Are responses parsed consistently?'] : []
  };

  const comparisonMatrix =
    intentType === 'comparison' && dimensions.length >= 2
      ? {
          dimension_a: dimensions[0].name,
          dimension_b: dimensions[1].name,
          comparison_points:
            dimensions[0].name === 'frontend-calls' && dimensions[1].name === 'backend-handlers'
              ? [
                  { aspect: 'endpoints', frontend_check: 'fetch URLs', backend_check: 'route paths' },
                  { aspect: 'methods', frontend_check: 'HTTP methods used', backend_check: 'methods accepted' },
                  { aspect: 'payloads', frontend_check: 'request body structure', backend_check: 'expected schema' },
                  { aspect: 'responses', frontend_check: 'response parsing', backend_check: 'response format' }
                ]
              : [
                  { aspect: 'surface', frontend_check: 'exported/used symbols', backend_check: 'implemented symbols' },
                  { aspect: 'behavior', frontend_check: 'assumptions', backend_check: 'implementation behavior' }
                ]
        }
      : undefined;

  return {
    intent_analysis: intentAnalysis,
    dimensions,
    ...(comparisonMatrix ? { comparison_matrix: comparisonMatrix } : {}),
    estimated_iterations: estimated,
    termination_conditions: ['All comparison points verified', 'No new findings in last iteration']
  };
}

function deriveDimensions(prompt: string, intentType: DiscoveryIntentType, files: string[]): DiscoveryDimension[] {
  const normalized = prompt.toLowerCase();

  if (intentType === 'comparison' && /\bfrontend\b/.test(normalized) && /\bbackend\b/.test(normalized)) {
    return [
      {
        name: 'frontend-calls',
        description: 'Client-side API calls and response/error handling',
        search_targets: suggestSearchTargets(files, ['admin-ui', 'frontend', 'client', 'ui', 'web']),
        focus_areas: ['fetch calls', 'axios instances', 'response parsing', 'error handling']
      },
      {
        name: 'backend-handlers',
        description: 'Server-side API implementations and route handlers',
        search_targets: suggestSearchTargets(files, ['bridge-server', 'server', 'routes', 'api', 'worker']),
        focus_areas: ['endpoint handlers', 'route paths', 'request validation', 'error responses']
      }
    ];
  }

  if (intentType === 'comparison' && /\bold\b/.test(normalized) && /\bnew\b/.test(normalized)) {
    return [
      {
        name: 'old-implementation',
        description: 'Legacy/previous implementation references',
        search_targets: suggestSearchTargets(files, ['legacy', 'old', 'v0', 'deprecated']),
        focus_areas: ['entrypoints', 'public surface', 'behavior']
      },
      {
        name: 'new-implementation',
        description: 'Current/new implementation references',
        search_targets: suggestSearchTargets(files, ['src', 'packages', 'new', 'v1', 'v2']),
        focus_areas: ['entrypoints', 'public surface', 'behavior']
      }
    ];
  }

  if (intentType === 'comparison' && /\btype(s|script)?\b/.test(normalized) && /\bapi\b|\bresponse(s)?\b/.test(normalized)) {
    return [
      {
        name: 'types',
        description: 'TypeScript types and schemas',
        search_targets: suggestSearchTargets(files, ['types', 'schema', 'dto']),
        focus_areas: ['type definitions', 'dto schemas', 'validators']
      },
      {
        name: 'api-responses',
        description: 'API response construction and formatting',
        search_targets: suggestSearchTargets(files, ['routes', 'controller', 'handler', 'api']),
        focus_areas: ['response shape', 'status codes', 'error format']
      }
    ];
  }

  return [
    {
      name: 'general',
      description: 'General codebase exploration',
      search_targets: [],
      focus_areas: ['references', 'call sites', 'implementations']
    }
  ];
}

function suggestSearchTargets(files: string[], tokens: string[]): string[] {
  const matches: string[] = [];
  const lowerTokens = tokens.map((t) => t.toLowerCase());

  for (const file of files) {
    const lower = file.toLowerCase();
    if (!lowerTokens.some((t) => lower.includes(t))) continue;

    const parts = file.split(/[\\/]+/g).filter(Boolean);
    if (parts.length === 0) continue;
    const prefix =
      parts[0] === 'packages' && parts.length >= 2 ? path.join(parts[0], parts[1]) : parts.length >= 1 ? parts[0] : file;
    matches.push(prefix);
  }

  const unique = Array.from(new Set(matches));
  const out = unique.slice(0, 6).map((p) => `${normalizeGlobPath(p)}/**`);
  return out;
}

async function exploreDimension(input: {
  repoRoot: string;
  scope: string;
  iteration: number;
  dimension: DiscoveryDimension;
  promptKeywords: string[];
}): Promise<DiscoveryIterationReport> {
  const { repoRoot, scope, iteration, dimension, promptKeywords } = input;

  const effectiveGlobs = resolveEffectiveGlobs(scope, dimension.search_targets);
  const patterns = getIterationPatterns(dimension.name, iteration, promptKeywords);

  const matches: RgMatch[] = [];
  const coveredAreas: string[] = [];
  for (const [areaLabel, pattern] of patterns) {
    const m = await rgSearch(repoRoot, pattern, effectiveGlobs, 75);
    matches.push(...m);
    coveredAreas.push(areaLabel);
    if (matches.length >= 150) break;
  }

  const findings = matches.slice(0, 150).map((m, index) => ({
    id: `F-${String(index + 1).padStart(3, '0')}`,
    title: `${dimension.name}: ${summarizeMatch(m.text)}`,
    category: 'code-occurrence',
    file: normalizeRepoRelative(repoRoot, m.file),
    line: m.line,
    snippet: m.text.trim().slice(0, 240),
    related_dimension: undefined,
    confidence: 0.55
  }));

  const uniqueFiles = new Set(findings.map((f) => f.file));
  const remainingAreas = getRemainingAreas(dimension.name, iteration);
  const leads = buildLeads(promptKeywords, findings);

  return {
    dimension: dimension.name,
    iteration,
    findings,
    coverage: {
      files_explored: uniqueFiles.size,
      areas_covered: coveredAreas,
      areas_remaining: remainingAreas
    },
    leads
  };
}

function buildLeads(promptKeywords: string[], findings: DiscoveryFinding[]): Array<{ description: string; suggested_search?: string }> {
  if (promptKeywords.length === 0) return [];
  const foundText = findings.map((f) => f.snippet.toLowerCase()).join('\n');
  const missing = promptKeywords.filter((k) => !foundText.includes(k.toLowerCase()));
  return missing.slice(0, 5).map((k) => ({ description: `Search for '${k}' occurrences`, suggested_search: k }));
}

function getIterationPatterns(
  dimensionName: string,
  iteration: number,
  promptKeywords: string[]
): Array<[areaLabel: string, pattern: string]> {
  if (dimensionName === 'frontend-calls') {
    if (iteration === 1) {
      return [
        ['fetch calls', String.raw`fetch\s*\(`],
        ['axios instances', String.raw`\baxios\.`]
      ];
    }
    if (iteration === 2) {
      return [
        ['client helpers', String.raw`\b(api|client)\b`],
        ['response parsing', String.raw`\.json\(\)`]
      ];
    }
    return keywordPatterns(promptKeywords);
  }

  if (dimensionName === 'backend-handlers') {
    if (iteration === 1) {
      return [['route handlers', String.raw`\b(app|router)\.(get|post|put|patch|delete|all)\s*\(`]];
    }
    if (iteration === 2) {
      return [
        ['error responses', String.raw`\b(res\.(status|json)|throw new Error)\b`],
        ['validation', String.raw`\b(zod|joi|validate)\b`]
      ];
    }
    return keywordPatterns(promptKeywords);
  }

  return keywordPatterns(promptKeywords);
}

function keywordPatterns(promptKeywords: string[]): Array<[string, string]> {
  return promptKeywords.slice(0, 6).map((k) => [`keyword:${k}`, escapeRgLiteral(k)]);
}

function getRemainingAreas(dimensionName: string, iteration: number): string[] {
  if (dimensionName === 'frontend-calls') {
    if (iteration === 1) return ['axios instances', 'response parsing', 'error handling'];
    if (iteration === 2) return ['keywords'];
  }
  if (dimensionName === 'backend-handlers') {
    if (iteration === 1) return ['validation', 'error responses', 'keywords'];
    if (iteration === 2) return ['keywords'];
  }
  return [];
}

function resolveEffectiveGlobs(scope: string, dimensionTargets: string[]): string[] {
  const normalizedScope = scope.trim() || DEFAULT_SCOPE;
  if (normalizedScope !== DEFAULT_SCOPE) {
    return [normalizedScope];
  }
  return dimensionTargets.length > 0 ? dimensionTargets : [DEFAULT_SCOPE];
}

async function runComparisonAnalysis(input: {
  repoRoot: string;
  scope: string;
  plan: DiscoveryPlan;
  dimensions: DiscoveryDimension[];
  outputDir: string;
}): Promise<{
  overallMatchRate: number;
  discrepancies: ComparisonDiscrepancy[];
}> {
  const { repoRoot, scope, plan, dimensions, outputDir } = input;

  const matrix = plan.comparison_matrix;
  if (!matrix) {
    const empty = {
      matrix: null,
      results: [],
      summary: { total_discrepancies: 0, overall_match_rate: 1, critical_mismatches: [] as string[] }
    };
    await writeJson(path.join(outputDir, 'comparison-analysis.json'), empty);
    return { overallMatchRate: 1, discrepancies: [] };
  }

  // Only implement endpoint comparison for the standard frontend/backend dimension pair for now.
  const [a, b] = dimensions;
  const isFrontendBackend = a.name === 'frontend-calls' && b.name === 'backend-handlers';
  if (!isFrontendBackend) {
    const generic = {
      matrix,
      results: [],
      summary: { total_discrepancies: 0, overall_match_rate: 1, critical_mismatches: [] as string[] }
    };
    await writeJson(path.join(outputDir, 'comparison-analysis.json'), generic);
    return { overallMatchRate: 1, discrepancies: [] };
  }

  const frontendGlobs = resolveEffectiveGlobs(scope, a.search_targets);
  const backendGlobs = resolveEffectiveGlobs(scope, b.search_targets);

  const frontendEndpoints = await extractFrontendEndpoints(repoRoot, frontendGlobs);
  const backendEndpoints = await extractBackendEndpoints(repoRoot, backendGlobs);

  const missingBackend = Array.from(frontendEndpoints).filter((p) => !backendEndpoints.has(p));
  const matched = Array.from(frontendEndpoints).filter((p) => backendEndpoints.has(p));

  const matchRate = frontendEndpoints.size === 0 ? 1 : matched.length / frontendEndpoints.size;
  const discrepancies: ComparisonDiscrepancy[] = missingBackend.map((p) => ({ type: 'missing_endpoint', frontend: p, backend: 'NOT_FOUND' }));

  const comparisonFile = {
    matrix,
    results: [
      {
        aspect: 'endpoints',
        dimension_a_count: frontendEndpoints.size,
        dimension_b_count: backendEndpoints.size,
        discrepancies: discrepancies.map((d) => ({ frontend: d.frontend, backend: d.backend, type: d.type })),
        match_rate: round(matchRate, 4)
      }
    ],
    summary: {
      total_discrepancies: discrepancies.length,
      overall_match_rate: round(matchRate, 4),
      critical_mismatches: discrepancies.length > 0 ? ['endpoints'] : []
    }
  };
  await writeJson(path.join(outputDir, 'comparison-analysis.json'), comparisonFile);

  return { overallMatchRate: matchRate, discrepancies };
}

async function extractFrontendEndpoints(repoRoot: string, globs: string[]): Promise<Set<string>> {
  const matches = await rgSearch(repoRoot, String.raw`(fetch|axios\.(get|post|put|patch|delete))\s*\(\s*['"\`][^'"\`]+['"\`]`, globs, 500);
  const out = new Set<string>();
  for (const m of matches) {
    const endpoint = extractFirstQuotedString(m.text);
    if (!endpoint) continue;
    if (!endpoint.startsWith('/')) continue;
    out.add(endpoint);
  }
  return out;
}

async function extractBackendEndpoints(repoRoot: string, globs: string[]): Promise<Set<string>> {
  const matches = await rgSearch(repoRoot, String.raw`(app|router)\.(get|post|put|patch|delete|all)\s*\(\s*['"\`][^'"\`]+['"\`]`, globs, 500);
  const out = new Set<string>();
  for (const m of matches) {
    const endpoint = extractFirstQuotedString(m.text);
    if (!endpoint) continue;
    if (!endpoint.startsWith('/')) continue;
    out.add(endpoint);
  }
  return out;
}

function extractFirstQuotedString(text: string): string | null {
  const m = text.match(/['"`]([^'"`]+)['"`]/);
  return m?.[1] ?? null;
}

async function writeIssuesFromComparison(
  outputDir: string,
  discoveryId: string,
  comparison: { discrepancies: ComparisonDiscrepancy[]; overallMatchRate: number }
): Promise<number> {
  const issuesPath = path.join(outputDir, 'discovery-issues.jsonl');
  const lines: string[] = [];

  let counter = 0;
  for (const d of comparison.discrepancies) {
    counter += 1;
    const issue = {
      id: `ISS-${discoveryId}-${String(counter).padStart(3, '0')}`,
      discovery_id: discoveryId,
      title: d.type === 'missing_endpoint' ? `Missing backend endpoint for ${d.frontend}` : `Discovery issue: ${d.type}`,
      severity: d.type === 'missing_endpoint' ? 'high' : 'medium',
      category: d.type,
      evidence: {
        frontend: d.frontend,
        backend: d.backend
      },
      confidence: d.type === 'missing_endpoint' ? 0.85 : 0.7
    };
    lines.push(JSON.stringify(issue));
  }

  await fs.promises.writeFile(issuesPath, lines.join('\n') + (lines.length > 0 ? '\n' : ''), 'utf8');
  return counter;
}

async function writeEmptyIssuesFile(outputDir: string): Promise<void> {
  await fs.promises.writeFile(path.join(outputDir, 'discovery-issues.jsonl'), '', 'utf8');
}

async function listFiles(repoRoot: string, scopeGlob: string): Promise<string[]> {
  const args = ['--files', '--glob', scopeGlob, ...BASE_EXCLUDE_GLOBS.flatMap((g) => ['--glob', g]), '.'];
  const res = await execFileUtf8('rg', args, { cwd: repoRoot });
  return res
    .split('\n')
    .map((l) => stripLeadingDotSlash(l.trim()))
    .filter(Boolean);
}

function summarizeCodebaseStructure(files: string[]): { modules: string[]; file_extensions: Record<string, number> } {
  const modules = new Set<string>();
  const extCounts: Record<string, number> = {};
  for (const f of files) {
    const parts = f.split(/[\\/]+/g).filter(Boolean);
    if (parts.length > 0) modules.add(parts[0]);
    const ext = path.extname(f).toLowerCase() || '<none>';
    extCounts[ext] = (extCounts[ext] ?? 0) + 1;
  }
  return { modules: Array.from(modules).sort(), file_extensions: extCounts };
}

async function findRelevantModules(repoRoot: string, scope: string, promptKeywords: string[]): Promise<string[]> {
  const limited = promptKeywords.slice(0, 3);
  const prefixes = new Set<string>();

  for (const keyword of limited) {
    const matches = await rgListFiles(repoRoot, keyword, scope, 10);
    for (const m of matches) {
      const parts = m.split(/[\\/]+/g).filter(Boolean);
      if (parts.length === 0) continue;
      const prefix = parts[0] === 'packages' && parts.length >= 2 ? path.join(parts[0], parts[1]) : parts[0];
      prefixes.add(prefix);
    }
  }

  return Array.from(prefixes).slice(0, 12).map(normalizeGlobPath);
}

async function rgListFiles(repoRoot: string, needle: string, scope: string, limit: number): Promise<string[]> {
  const args = [
    '-l',
    '-i',
    '--max-count',
    '1',
    '--glob',
    scope,
    ...BASE_EXCLUDE_GLOBS.flatMap((g) => ['--glob', g]),
    escapeRgLiteral(needle),
    '.'
  ];
  const res = await execFileUtf8('rg', args, { cwd: repoRoot, allowExitCodes: [0, 1] });
  return res
    .split('\n')
    .map((l) => stripLeadingDotSlash(l.trim()))
    .filter(Boolean)
    .slice(0, limit);
}

async function rgSearch(repoRoot: string, pattern: string, globs: string[], limit: number): Promise<RgMatch[]> {
  const args = ['--line-number', '--column', '--no-heading', '--color', 'never', '--max-count', String(limit)];
  for (const g of globs) args.push('--glob', g);
  for (const g of BASE_EXCLUDE_GLOBS) args.push('--glob', g);
  args.push(pattern, '.');

  const res = await execFileUtf8('rg', args, { cwd: repoRoot, allowExitCodes: [0, 1] });
  if (!res.trim()) return [];

  const lines = res.split('\n').filter(Boolean);
  const out: RgMatch[] = [];
  for (const line of lines) {
    const parsed = parseRgLine(line);
    if (!parsed) continue;
    out.push(parsed);
  }
  return out;
}

function parseRgLine(line: string): RgMatch | null {
  const m = line.match(/^(.*?):(\d+):(\d+):(.*)$/);
  if (!m) return null;
  return { file: m[1], line: Number(m[2]), column: Number(m[3]), text: m[4] ?? '' };
}

async function execFileUtf8(
  command: string,
  args: string[],
  opts: { cwd: string; allowExitCodes?: number[] }
): Promise<string> {
  const allow = new Set(opts.allowExitCodes ?? [0]);
  const startedAt = Date.now();
  if (DBP_DEBUG) {
    const prettyArgs = args.map((a) => (a.includes(' ') ? JSON.stringify(a) : a)).join(' ');
    // eslint-disable-next-line no-console
    console.error(`[dbp] exec cwd=${opts.cwd} ${command} ${prettyArgs}`);
  }
  return await new Promise<string>((resolve, reject) => {
    execFile(command, args, { cwd: opts.cwd, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }, (err, stdout, stderr) => {
      const code = (err as any)?.code;
      if (err && (typeof code !== 'number' || !allow.has(code))) {
        const message = stderr?.trim() ? stderr.trim() : err.message;
        reject(new Error(message));
        return;
      }
      if (DBP_DEBUG) {
        const elapsedMs = Date.now() - startedAt;
        // eslint-disable-next-line no-console
        console.error(`[dbp] ok (${elapsedMs}ms) ${command}`);
      }
      resolve(stdout ?? '');
    });
  });
}

async function writeJson(filePath: string, data: unknown): Promise<void> {
  const json = JSON.stringify(data, null, 2) + '\n';
  await fs.promises.writeFile(filePath, json, 'utf8');
}

async function findRepoRoot(startDir: string): Promise<string> {
  let current = path.resolve(startDir);
  while (true) {
    const pkgPath = path.join(current, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(await fs.promises.readFile(pkgPath, 'utf8'));
        if (pkg?.workspaces || pkg?.name === 'mcp-nexus') return current;
      } catch {
        // ignore
      }
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return path.resolve(startDir);
}

function formatUtcTimestamp(date: Date): string {
  const yyyy = String(date.getUTCFullYear());
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const min = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}-${hh}${min}${ss}`;
}

function sanitizeFileStem(name: string): string {
  const trimmed = name.trim().toLowerCase();
  const slug = trimmed.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return slug || 'dimension';
}

function normalizeRepoRelative(repoRoot: string, filePath: string): string {
  const abs = path.isAbsolute(filePath) ? filePath : path.join(repoRoot, filePath);
  const rel = path.relative(repoRoot, abs);
  return normalizeGlobPath(rel);
}

function normalizeGlobPath(p: string): string {
  return p.replace(/\\/g, '/');
}

function stripLeadingDotSlash(p: string): string {
  if (p.startsWith('./')) return p.slice(2);
  if (p.startsWith('.\\')) return p.slice(2);
  return p;
}

function escapeRgLiteral(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function summarizeMatch(text: string): string {
  const cleaned = text.trim().replace(/\s+/g, ' ');
  if (!cleaned) return 'match';
  return cleaned.slice(0, 80);
}

function calculateConfidence(totalFindings: number, iterations: number): number {
  if (iterations <= 0) return 0;
  // Confidence heuristic: more unique findings and more iterations = higher confidence, capped.
  const base = Math.min(1, totalFindings / 50);
  const iterBoost = Math.min(0.2, iterations * 0.05);
  return round(Math.min(1, base * 0.8 + iterBoost), 2);
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

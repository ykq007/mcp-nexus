import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { detectIntentType, extractPromptKeywords, runIssueDiscoverByPrompt } from '../src/workflow/issueDiscoverByPrompt.js';

describe('issueDiscoverByPrompt', () => {
  it('detects intent type from prompt', () => {
    expect(detectIntentType('compare A vs B')).toBe('comparison');
    expect(detectIntentType('find where token is parsed')).toBe('search');
    expect(detectIntentType('verify config is correct')).toBe('verification');
    expect(detectIntentType('analyze error handling patterns')).toBe('audit');
  });

  it('extracts stable prompt keywords', () => {
    const keywords = extractPromptKeywords('Check if frontend calls match backend implementations');
    expect(keywords).toContain('calls');
    expect(keywords).toContain('implementations');
    expect(keywords).not.toContain('frontend');
    expect(keywords).not.toContain('backend');
  });

  it(
    'writes discovery files and comparison issues',
    async () => {
    const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'dbp-test-'));
    try {
      await fs.promises.writeFile(path.join(tmp, 'package.json'), JSON.stringify({ name: 'mcp-nexus', workspaces: [] }, null, 2));
      await fs.promises.mkdir(path.join(tmp, 'src'), { recursive: true });
      await fs.promises.mkdir(path.join(tmp, 'dist'), { recursive: true });

      await fs.promises.writeFile(
        path.join(tmp, 'src', 'frontend.ts'),
        ["fetch('/api/users/profile')", "fetch('/api/missing')"].join('\n'),
        'utf8'
      );
      await fs.promises.writeFile(path.join(tmp, 'src', 'backend.ts'), "app.get('/api/users/profile', () => {});\n", 'utf8');
      await fs.promises.writeFile(path.join(tmp, 'dist', 'noise.js'), "fetch('/api/ghost')\n", 'utf8');

      const summary = await runIssueDiscoverByPrompt({
        prompt: 'compare frontend vs backend',
        repoRoot: tmp,
        scope: '**/*',
        depth: 'standard',
        maxIterations: 1
      });

      expect(summary.intent_type).toBe('comparison');
      expect(summary.dimensions).toEqual(['frontend-calls', 'backend-handlers']);
      expect(summary.issues_generated).toBe(1);

      const outputDir = path.join(tmp, '.workflow', 'issues', 'discoveries', summary.discovery_id);
      const statePath = path.join(outputDir, 'discovery-state.json');
      const comparisonPath = path.join(outputDir, 'comparison-analysis.json');
      const issuesPath = path.join(outputDir, 'discovery-issues.jsonl');
      const iter1Frontend = path.join(outputDir, 'iterations', '1', 'frontend-calls.json');
      const iter1Backend = path.join(outputDir, 'iterations', '1', 'backend-handlers.json');

      expect(fs.existsSync(statePath)).toBe(true);
      expect(fs.existsSync(comparisonPath)).toBe(true);
      expect(fs.existsSync(issuesPath)).toBe(true);
      expect(fs.existsSync(iter1Frontend)).toBe(true);
      expect(fs.existsSync(iter1Backend)).toBe(true);

      const issuesLines = (await fs.promises.readFile(issuesPath, 'utf8'))
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      expect(issuesLines).toHaveLength(1);
      expect(issuesLines[0]).toContain('/api/missing');

      const comparison = JSON.parse(await fs.promises.readFile(comparisonPath, 'utf8'));
      expect(comparison.summary.total_discrepancies).toBe(1);
      expect(comparison.results[0].discrepancies[0].frontend).toBe('/api/missing');
    } finally {
      await fs.promises.rm(tmp, { recursive: true, force: true });
    }
    },
    15_000
  );
});

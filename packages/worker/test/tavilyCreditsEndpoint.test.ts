import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('tavily credits endpoint', () => {
  it('uses /usage (not /credits)', () => {
    const source = readFileSync(new URL('../src/routes/admin/index.ts', import.meta.url), 'utf8');
    expect(source).toContain('https://api.tavily.com/usage');
    expect(source).not.toContain('https://api.tavily.com/credits');
  });
});


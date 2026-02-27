import { describe, it, expect } from 'vitest';

import { redactSensitiveQueryParams } from '../src/utils/redact.js';

describe('redactSensitiveQueryParams', () => {
  it('redacts tavilyApiKey in log lines', () => {
    const input = '<-- POST /mcp?tavilyApiKey=supersecret&x=1';
    const output = redactSensitiveQueryParams(input);
    expect(output).toBe('<-- POST /mcp?tavilyApiKey=REDACTED&x=1');
  });

  it('redacts token in log lines', () => {
    const input = '--> GET /mcp/sse?token=supersecret 200 3ms';
    const output = redactSensitiveQueryParams(input);
    expect(output).toBe('--> GET /mcp/sse?token=REDACTED 200 3ms');
  });
});


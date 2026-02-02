import { describe, expect, it } from 'vitest';
import { orderKeyCandidates, parseTavilyKeySelectionStrategy } from '../src/tavily/keySelection.js';

describe('keySelection', () => {
  describe('parseTavilyKeySelectionStrategy', () => {
    it('defaults to round_robin', () => {
      expect(parseTavilyKeySelectionStrategy(undefined)).toBe('round_robin');
      expect(parseTavilyKeySelectionStrategy('')).toBe('round_robin');
      expect(parseTavilyKeySelectionStrategy('  ')).toBe('round_robin');
      expect(parseTavilyKeySelectionStrategy('unknown')).toBe('round_robin');
    });

    it('parses known values', () => {
      expect(parseTavilyKeySelectionStrategy('random')).toBe('random');
      expect(parseTavilyKeySelectionStrategy('ROUND_ROBIN')).toBe('round_robin');
      expect(parseTavilyKeySelectionStrategy('round-robin')).toBe('round_robin');
      expect(parseTavilyKeySelectionStrategy('rr')).toBe('round_robin');
    });
  });

  describe('orderKeyCandidates', () => {
    it('returns keys unchanged for round_robin', () => {
      const keys = [1, 2, 3];
      const ordered = orderKeyCandidates(keys, 'round_robin');
      expect(ordered).toEqual([1, 2, 3]);
      expect(ordered).not.toBe(keys);
    });

    it('shuffles keys for random (deterministic rng)', () => {
      const keys = [1, 2, 3, 4];
      const rng = (() => {
        const seq = [0, 0, 0];
        let i = 0;
        return () => seq[i++] ?? 0;
      })();
      const ordered = orderKeyCandidates(keys, 'random', rng);
      expect(ordered).toEqual([2, 3, 4, 1]);
    });
  });
});


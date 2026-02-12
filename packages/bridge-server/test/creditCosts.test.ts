import { describe, expect, it } from 'vitest';
import { calculateOperationCost, isExpensiveOperation, type OperationType } from '../src/tavily/creditCosts.js';

describe('creditCosts', () => {
  describe('calculateOperationCost', () => {
    it('calculates search costs correctly', () => {
      // Basic search: 1 credit
      const basicSearch = calculateOperationCost('search', { search_depth: 'basic' });
      expect(basicSearch.estimated).toBe(1);
      expect(basicSearch.min).toBe(1);
      expect(basicSearch.max).toBe(1);

      // Advanced search: 2 credits
      const advancedSearch = calculateOperationCost('search', { search_depth: 'advanced' });
      expect(advancedSearch.estimated).toBe(2);
      expect(advancedSearch.min).toBe(2);
      expect(advancedSearch.max).toBe(2);

      // Fast search: 1 credit
      const fastSearch = calculateOperationCost('search', { search_depth: 'fast' });
      expect(fastSearch.estimated).toBe(1);

      // Default (no params): 1 credit
      const defaultSearch = calculateOperationCost('search');
      expect(defaultSearch.estimated).toBe(1);
    });

    it('calculates extract costs correctly', () => {
      // Basic extract, 1 URL: 0.2 credits
      const basicExtract = calculateOperationCost('extract', { extract_depth: 'basic', urls: ['https://example.com'] });
      expect(basicExtract.estimated).toBe(0.2);

      // Advanced extract, 1 URL: 0.4 credits
      const advancedExtract = calculateOperationCost('extract', { extract_depth: 'advanced', urls: ['https://example.com'] });
      expect(advancedExtract.estimated).toBe(0.4);

      // Basic extract, 5 URLs: 1.0 credits
      const multiUrlExtract = calculateOperationCost('extract', { extract_depth: 'basic', urls: ['url1', 'url2', 'url3', 'url4', 'url5'] });
      expect(multiUrlExtract.estimated).toBe(1.0);

      // Advanced extract, 10 URLs: 4.0 credits
      const advancedMultiUrl = calculateOperationCost('extract', { extract_depth: 'advanced', urls: new Array(10).fill('url') });
      expect(advancedMultiUrl.estimated).toBe(4.0);

      // Default (no URLs): 0.2 credits
      const defaultExtract = calculateOperationCost('extract');
      expect(defaultExtract.estimated).toBe(0.2);
    });

    it('calculates map costs correctly', () => {
      // Default map (limit 50): ~7.5 credits
      const defaultMap = calculateOperationCost('map');
      expect(defaultMap.estimated).toBe(7.5);
      expect(defaultMap.min).toBeGreaterThan(0);
      expect(defaultMap.max).toBeGreaterThanOrEqual(defaultMap.estimated);

      // Small map (limit 10): ~1.5 credits
      const smallMap = calculateOperationCost('map', { limit: 10 });
      expect(smallMap.estimated).toBe(1.5);

      // Large map (limit 100): ~7.5 credits (capped at 50 pages)
      const largeMap = calculateOperationCost('map', { limit: 100 });
      expect(largeMap.estimated).toBe(7.5);
      expect(largeMap.max).toBe(15.0); // 100 * 0.15
    });

    it('calculates crawl costs correctly', () => {
      // Crawl = Map + Extract
      // Default crawl (limit 50, basic): map(7.5) + extract(50 * 0.2) = 17.5
      const defaultCrawl = calculateOperationCost('crawl');
      expect(defaultCrawl.estimated).toBe(17.5);

      // Advanced crawl (limit 50): map(7.5) + extract(50 * 0.4) = 27.5
      const advancedCrawl = calculateOperationCost('crawl', { extract_depth: 'advanced' });
      expect(advancedCrawl.estimated).toBe(27.5);

      // Small crawl (limit 10, basic): map(1.5) + extract(10 * 0.2) = 3.5
      const smallCrawl = calculateOperationCost('crawl', { limit: 10 });
      expect(smallCrawl.estimated).toBe(3.5);

      // Ensure min < estimated < max
      expect(defaultCrawl.min).toBeLessThan(defaultCrawl.estimated);
      expect(defaultCrawl.estimated).toBeLessThanOrEqual(defaultCrawl.max);
    });

    it('calculates research costs correctly', () => {
      // Mini model: 10-50 credits, estimated 25
      const miniResearch = calculateOperationCost('research', { model: 'mini' });
      expect(miniResearch.min).toBe(10);
      expect(miniResearch.max).toBe(50);
      expect(miniResearch.estimated).toBe(25);

      // Pro model: 50-200 credits, estimated 100
      const proResearch = calculateOperationCost('research', { model: 'pro' });
      expect(proResearch.min).toBe(50);
      expect(proResearch.max).toBe(200);
      expect(proResearch.estimated).toBe(100);

      // Auto model: 10-200 credits, estimated 50
      const autoResearch = calculateOperationCost('research', { model: 'auto' });
      expect(autoResearch.min).toBe(10);
      expect(autoResearch.max).toBe(200);
      expect(autoResearch.estimated).toBe(50);

      // Default (no model): same as auto
      const defaultResearch = calculateOperationCost('research');
      expect(defaultResearch.estimated).toBe(50);
    });

    it('handles unknown operation types gracefully', () => {
      const unknownOp = calculateOperationCost('unknown' as OperationType);
      expect(unknownOp.estimated).toBe(1);
      expect(unknownOp.min).toBe(1);
      expect(unknownOp.max).toBe(1);
    });
  });

  describe('isExpensiveOperation', () => {
    it('identifies expensive operations correctly', () => {
      expect(isExpensiveOperation('crawl')).toBe(true);
      expect(isExpensiveOperation('research')).toBe(true);
      expect(isExpensiveOperation('search')).toBe(false);
      expect(isExpensiveOperation('extract')).toBe(false);
      expect(isExpensiveOperation('map')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('handles empty URLs array', () => {
      const result = calculateOperationCost('extract', { urls: [] });
      expect(result.estimated).toBe(0);
    });

    it('handles zero limit', () => {
      const result = calculateOperationCost('map', { limit: 0 });
      expect(result.estimated).toBe(0);
    });

    it('handles negative limit gracefully', () => {
      const result = calculateOperationCost('map', { limit: -10 });
      // Should treat as 0 or minimal cost
      expect(result.estimated).toBeGreaterThanOrEqual(0);
    });

    it('handles very large URL arrays', () => {
      const largeUrlArray = new Array(1000).fill('url');
      const result = calculateOperationCost('extract', { urls: largeUrlArray, extract_depth: 'basic' });
      expect(result.estimated).toBe(200); // 1000 * 0.2
    });
  });
});

export type TavilyKeySelectionStrategy = 'round_robin' | 'random';

export function parseTavilyKeySelectionStrategy(raw: unknown, fallback: TavilyKeySelectionStrategy = 'round_robin'): TavilyKeySelectionStrategy {
  if (typeof raw !== 'string') return fallback;
  const normalized = raw.trim().toLowerCase();
  if (!normalized) return fallback;

  if (normalized === 'random') return 'random';
  if (normalized === 'round_robin' || normalized === 'round-robin' || normalized === 'rr') return 'round_robin';

  return fallback;
}

export function orderKeyCandidates<T>(
  keys: readonly T[],
  strategy: TavilyKeySelectionStrategy,
  rng: () => number = Math.random
): T[] {
  if (strategy === 'round_robin') return [...keys];

  // Fisher–Yates shuffle.
  const out = [...keys];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const r = rng();
    const j = Math.floor(r * (i + 1));
    if (j === i) continue;
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}


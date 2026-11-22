/**
 * DARKFORGE PRNG — mulberry32 (32-bit state) with labelled sub-streams.
 *
 * mulberry32 (Tommy Ettinger, public domain):
 *   t = (state += 0x6D2B79F5); t = imul(t ^ t>>>15, t|1); t ^= t + imul(t ^ t>>>7, t|61);
 *   return ((t ^ t>>>14) >>> 0) / 2^32
 *
 * Sub-streams: deriveSeed(seed, ...labels) hashes the parent seed together with
 * string labels (xmur3-style string hash) so that independent concerns
 * (e.g. "loot.quality" vs "loot.affix") never share a sequence. This guarantees
 * that changing Magic Find (quality stream) never shifts tier rolls (affix stream).
 *
 * The engine MUST NOT use Math.random().
 */

export function xmur3(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  h ^= h >>> 16;
  return h >>> 0;
}

export function deriveSeed(seed: number, ...labels: (string | number)[]): number {
  return xmur3(`${seed >>> 0}|${labels.join('|')}`);
}

export function mulberry32Next(state: number): { value: number; state: number } {
  const s = (state + 0x6d2b79f5) >>> 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, state: s };
}

export class Rng {
  private state: number;
  /** number of values drawn (telemetry / debugging) */
  draws = 0;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  static fromLabels(seed: number, ...labels: (string | number)[]): Rng {
    return new Rng(deriveSeed(seed, ...labels));
  }

  getState(): number {
    return this.state;
  }

  /** uniform float in [0,1) */
  next(): number {
    const r = mulberry32Next(this.state);
    this.state = r.state;
    this.draws++;
    return r.value;
  }

  /** uniform integer in [min, max] inclusive */
  int(min: number, max: number): number {
    if (!Number.isFinite(min) || !Number.isFinite(max)) throw new Error('Rng.int: non-finite bounds');
    if (max < min) throw new Error(`Rng.int: max<min (${min},${max})`);
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** true with probability p (p clamped to [0,1]) */
  chance(p: number): boolean {
    const q = Number.isFinite(p) ? Math.min(1, Math.max(0, p)) : 0;
    return this.next() < q;
  }

  /** weighted pick; weights must be >= 0. Returns -1 when total weight is 0. */
  weightedIndex(weights: readonly number[]): number {
    let total = 0;
    for (const w of weights) {
      if (!(w >= 0) || !Number.isFinite(w)) throw new Error(`Rng.weightedIndex: invalid weight ${w}`);
      total += w;
    }
    if (total <= 0) return -1;
    let r = this.next() * total;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i]!;
      if (r < 0) return i;
    }
    // floating point edge: return last positive weight
    for (let i = weights.length - 1; i >= 0; i--) if (weights[i]! > 0) return i;
    return -1;
  }

  pickWeighted<T>(items: readonly T[], weight: (t: T) => number): T | undefined {
    const idx = this.weightedIndex(items.map(weight));
    return idx < 0 ? undefined : items[idx];
  }

  fork(...labels: (string | number)[]): Rng {
    return new Rng(deriveSeed(this.state, ...labels));
  }
}

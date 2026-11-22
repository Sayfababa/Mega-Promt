import { Rng, deriveSeed, mulberry32Next } from '../../engine/core/rng';
import { roundHalfUp, round1, clamp, safe } from '../../engine/core/fixedPoint';
import { hashOf } from '../../engine/core/hash';

describe('mulberry32 PRNG', () => {
  it('produces the documented reference sequence for seed 1', () => {
    const r = new Rng(1);
    const seq = [r.next(), r.next(), r.next()].map((x) => x.toFixed(10));
    // reference values of the canonical mulberry32 implementation (verified in node)
    expect(seq).toEqual(['0.6270739406', '0.0027357212', '0.5274470400']);
  });
  it('matches the canonical closure implementation for 10k draws', () => {
    for (const seed of [1, 42, 4294967295]) {
      let a = seed;
      const ref = (): number => { let t = (a += 0x6d2b79f5); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      const r = new Rng(seed);
      for (let i = 0; i < 10000; i++) expect(r.next()).toBe(ref());
    }
  });
  it('is deterministic and stateless-reproducible', () => {
    const a = new Rng(12345);
    const b = new Rng(12345);
    for (let i = 0; i < 1000; i++) expect(a.next()).toBe(b.next());
    expect(mulberry32Next(7).value).toBe(new Rng(7).next());
  });
  it('sub-streams differ by label and are stable', () => {
    expect(deriveSeed(1, 'loot', 'quality')).toBe(deriveSeed(1, 'loot', 'quality'));
    expect(deriveSeed(1, 'loot', 'quality')).not.toBe(deriveSeed(1, 'loot', 'affix'));
  });
  it('int stays in bounds and covers the range', () => {
    const r = new Rng(99);
    const seen = new Set<number>();
    for (let i = 0; i < 5000; i++) {
      const v = r.int(-1, 1);
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
      seen.add(v);
    }
    expect(seen.size).toBe(3);
  });
  it('weightedIndex respects weights and rejects invalid weights', () => {
    const r = new Rng(5);
    const counts = [0, 0, 0];
    for (let i = 0; i < 30000; i++) counts[r.weightedIndex([1, 0, 3])]!++;
    expect(counts[1]).toBe(0);
    expect(counts[2]! / counts[0]!).toBeGreaterThan(2.7);
    expect(counts[2]! / counts[0]!).toBeLessThan(3.3);
    expect(r.weightedIndex([0, 0])).toBe(-1);
    expect(() => r.weightedIndex([1, -1])).toThrow();
    expect(() => r.weightedIndex([NaN])).toThrow();
  });
});

describe('fixedPoint', () => {
  it('rounds half up', () => {
    expect(roundHalfUp(2.5)).toBe(3);
    expect(roundHalfUp(2.49)).toBe(2);
    expect(roundHalfUp(1.0000000000000002 * 2.5)).toBe(3);
    expect(roundHalfUp(0.5)).toBe(1);
    expect(round1(1.25)).toBe(1.3);
    expect(round1(10.04)).toBe(10);
  });
  it('guards NaN', () => {
    expect(safe(NaN)).toBe(0);
    expect(clamp(NaN, 1, 5)).toBe(1);
  });
  it('hash is key-order independent', () => {
    expect(hashOf({ a: 1, b: [1, 2] })).toBe(hashOf({ b: [1, 2], a: 1 }));
  });
});

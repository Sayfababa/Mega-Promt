import { B } from '../../content/balance';
import { AFFIX_BY_ID } from '../../content/affixes/affixes';
import { getBase } from '../../content/bases/bases';
import { DUNGEONS } from '../../content/dungeons/dungeons';
import {
  emptyTelemetry, expectedDropCount, generateEncounterDrops, generateItem, pAtLeastOneUniqueCandidate, rarityProbabilities, type DropContext,
} from '../../engine/loot/generator';
import { addAffixOdds, eligibleFamilies, tierWeights } from '../../engine/loot/affixRoll';
import { mkItem } from '../fixtures/items';
import type { ItemInstance } from '../../engine/types';

const crypt = DUNGEONS.find((d) => d.id === 'decayed_crypt')!;
const ctx = (seed: number, over: Partial<DropContext> = {}): DropContext => ({
  seed, encounterType: 'normal', monsterLevel: 12, baseWeights: crypt.baseWeights, baseFamilies: crypt.baseFamilies, magicFind: 0, source: 'test', ...over,
});

function checkItemInvariants(it: ItemInstance): void {
  const base = getBase(it.baseId);
  const max = { normal: [0, 0], magic: [1, 1], rare: [3, 3], unique: [0, 0] }[it.rarity];
  expect(it.prefixes.length).toBeLessThanOrEqual(max[0]!);
  expect(it.suffixes.length).toBeLessThanOrEqual(max[1]!);
  const groups = new Set<string>();
  for (const a of [...it.prefixes, ...it.suffixes]) {
    const f = AFFIX_BY_ID[a.familyId]!;
    expect(f).toBeDefined();
    expect(f.categories.some((c) => base.categories.includes(c))).toBe(true);
    expect(groups.has(f.groupId)).toBe(false);
    groups.add(f.groupId);
    expect(it.itemLevel).toBeGreaterThanOrEqual(B.affixTierMinIlvl[a.tier] ?? 1);
    if (a.tier === 1) expect(it.itemLevel).toBeGreaterThanOrEqual(80);
    expect(f.weight).toBeGreaterThan(0);
  }
  for (const a of it.prefixes) expect(AFFIX_BY_ID[a.familyId]!.side).toBe('prefix');
  for (const a of it.suffixes) expect(AFFIX_BY_ID[a.familyId]!.side).toBe('suffix');
}

describe('loot tables (spec 7)', () => {
  it('expected item counts match the tables exactly', () => {
    expect(expectedDropCount('normal')).toBeCloseTo(0.95, 12);
    expect(expectedDropCount('boss')).toBeCloseTo(2.9, 12);
    expect(4 * expectedDropCount('normal') + expectedDropCount('boss')).toBeCloseTo(6.7, 12);
  });
  it('MF formula: 200 MF → +40% relative unique chance', () => {
    expect(rarityProbabilities('boss', 200).unique).toBeCloseTo(0.021, 12);
    expect(rarityProbabilities('boss', 0).unique).toBeCloseTo(0.015, 12);
    const p = rarityProbabilities('riftboss', 1e9);
    expect(p.normal + p.magic + p.rare + p.unique).toBeCloseTo(1, 12);
  });
  it('P(>=1 unique candidate per boss) matches Appendix A.2 theory', () => {
    expect(pAtLeastOneUniqueCandidate('boss', 0)).toBeCloseTo(0.04283, 4);
    expect(pAtLeastOneUniqueCandidate('boss', 200)).toBeCloseTo(0.05959, 4);
  });
  it('100.000 generated items match the rarity distribution within a 99.9% CI', () => {
    const tel = emptyTelemetry();
    const N = 100_000;
    for (let i = 0; i < N; i++) generateItem(ctx(i), 0, tel);
    const p = rarityProbabilities('normal', 0);
    for (const r of ['normal', 'magic', 'rare'] as const) {
      const sd = Math.sqrt(N * p[r] * (1 - p[r]));
      expect(Math.abs(tel.byRarity[r] - N * p[r] + (r === 'rare' ? -tel.failedUniqueRolls : 0))).toBeLessThan(3.3 * sd + 1);
    }
    const sdU = Math.sqrt(N * p.unique * (1 - p.unique));
    expect(Math.abs(tel.uniqueCandidates - N * p.unique)).toBeLessThan(3.3 * sdU);
    // candidates are split into real uniques and documented rare fallbacks
    expect(tel.uniqueDrops + tel.failedUniqueRolls).toBe(tel.uniqueCandidates);
  });
  it('generated items never violate affix rules (2.000 rares/magics across levels)', () => {
    for (let i = 0; i < 2000; i++) {
      const lvl = 1 + (i % 100);
      const it = generateItem(ctx(i, { monsterLevel: lvl, encounterType: 'boss', baseFamilies: crypt.baseFamilies }), 0, emptyTelemetry(), { forceRarity: i % 2 ? 'rare' : 'magic' });
      checkItemInvariants(it);
      if (it.rarity === 'rare' && it.itemLevel < 20 && !it.history.some((h) => h.action === 'failedUniqueRoll')) expect(it.prefixes.length + it.suffixes.length).toBeLessThanOrEqual(4);
    }
  });
  it('Magic Find never changes base/tier/value rolls (separate sub-streams)', () => {
    let compared = 0;
    for (let s = 0; s < 3000; s++) {
      const a = generateItem(ctx(s, { monsterLevel: 85 }), 0, emptyTelemetry());
      const b = generateItem(ctx(s, { monsterLevel: 85, magicFind: 5000 }), 0, emptyTelemetry());
      expect(b.baseId).toBe(a.baseId);
      expect(b.itemLevel).toBe(a.itemLevel);
      const failed = (x: ItemInstance): boolean => x.history.some((h) => h.action === 'failedUniqueRoll');
      if (a.rarity === b.rarity && a.rarity !== 'unique' && !failed(a) && !failed(b)) {
        expect(b.prefixes).toEqual(a.prefixes);
        expect(b.suffixes).toEqual(a.suffixes);
        compared++;
      }
    }
    expect(compared).toBeGreaterThan(100);
  });
  it('unique roll without eligible unique → rare with 6 affixes + failedUniqueRoll', () => {
    const it = generateItem(ctx(1, { monsterLevel: 85 }), 0, emptyTelemetry(), { forceRarity: 'unique', forceBase: getBase('helm_cloth_t6') });
    expect(it.rarity).toBe('rare');
    expect(it.prefixes.length + it.suffixes.length).toBe(6);
    expect(it.history.some((h) => h.action === 'failedUniqueRoll')).toBe(true);
  });
  it('eligible unique is produced on matching base', () => {
    const tel = emptyTelemetry();
    const it = generateItem(ctx(1, { monsterLevel: 12 }), 0, tel, { forceRarity: 'unique', forceBase: getBase('shortsword_t1') });
    expect(it.rarity).toBe('unique');
    expect(it.uniqueId).toBe('u_copperripper');
    expect(tel.uniqueDrops).toBe(1);
  });
  it('boss-exclusive uniques only drop from their boss', () => {
    const it = generateItem(ctx(1, { monsterLevel: 12 }), 0, emptyTelemetry(), { forceRarity: 'unique', forceBase: getBase('shield_t1') });
    expect(it.uniqueId).toBeUndefined();
    const it2 = generateItem(ctx(1, { monsterLevel: 12, bossId: 'boss_gravelord' }), 0, emptyTelemetry(), { forceRarity: 'unique', forceBase: getBase('shield_t1') });
    expect(it2.uniqueId).toBe('u_gravelordoath');
  });
  it('encounter drops are deterministic per seed', () => {
    const a = generateEncounterDrops(ctx(42, { encounterType: 'boss' }));
    const b = generateEncounterDrops(ctx(42, { encounterType: 'boss' }));
    expect(a.items).toEqual(b.items);
    expect(a.items.length).toBeGreaterThanOrEqual(2);
  });
});

describe('affix odds (spec 7.1 example)', () => {
  it('tier weights renormalise over allowed tiers; T1 = 5% at ilvl 82', () => {
    const f = AFFIX_BY_ID.p01!;
    const tw = tierWeights(f, 82);
    expect(tw.find((t) => t.tier === 1)!.p).toBeCloseTo(0.05, 12);
    expect(tierWeights(f, 39).map((t) => t.tier)).toEqual([5, 4]);
    expect(tierWeights(f, 39)[0]!.p).toBeCloseTo(0.5, 12);
  });
  it('occupied group drops to exactly 0% and the pool renormalises', () => {
    const item = mkItem('x', 'greataxe_t5', { rarity: 'rare', ilvl: 82, prefixes: [{ familyId: 'p01', tier: 3, values: [80] }] });
    const odds = addAffixOdds(item, { side: 'prefix' });
    expect(odds.find((o) => o.familyId === 'p01')).toBeUndefined();
    expect(odds.reduce((s, o) => s + o.p, 0)).toBeCloseTo(1, 12);
    const pool = eligibleFamilies(item, 'prefix');
    const w = pool.reduce((s, f) => s + f.weight, 0);
    expect(odds.find((o) => o.familyId === 'p02')!.p).toBeCloseTo(85 / w, 12);
  });
  it('rings never receive weapon-local or armour-local affixes', () => {
    const ring = mkItem('r', 'ring_ruby', { rarity: 'rare', ilvl: 80 });
    const fams = [...eligibleFamilies(ring, 'prefix'), ...eligibleFamilies(ring, 'suffix')].map((f) => f.id);
    for (const local of ['p01', 'p02', 'p03', 'p15', 's05', 's08', 's16']) expect(fams).not.toContain(local);
  });
});

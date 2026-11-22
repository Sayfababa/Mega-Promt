/**
 * Loot engine (spec 7). Per encounter: discrete item count → per item: ilvl, rarity (MF), base,
 * unique eligibility (AFTER base choice), affixes. All probabilities are per generated item.
 *
 * Independent RNG sub-streams per concern and item index:
 *   count | ilvl.i | quality.i | base.i | side.i | fam.i | tier.i | val.i | unique.i
 * → Magic Find (quality stream only) never shifts base/tier/value rolls.
 */
import { B } from '../../content/balance';
import { BASES, getBase } from '../../content/bases/bases';
import { UNIQUES } from '../../content/uniques/uniques';
import { Rng } from '../core/rng';
import { clamp } from '../core/fixedPoint';
import { addRandomAffix, type AffixRngs } from './affixRoll';
import type { BaseGroup, EncounterType, ItemBase, ItemInstance, Rarity, UniqueDef } from '../types';

export interface DropContext {
  seed: number;
  encounterType: EncounterType;
  monsterLevel: number;
  baseWeights: Record<BaseGroup, number>;
  baseFamilies: string[];
  magicFind: number;
  bossId?: string;
  source: string;
  /** rift: relative multiplier on the rare share */
  rareWeightMult?: number;
}

export interface LootTelemetry {
  items: number;
  uniqueCandidates: number;
  uniqueDrops: number;
  failedUniqueRolls: number;
  byRarity: Record<Rarity, number>;
}

export function emptyTelemetry(): LootTelemetry {
  return { items: 0, uniqueCandidates: 0, uniqueDrops: 0, failedUniqueRolls: 0, byRarity: { normal: 0, magic: 0, rare: 0, unique: 0 } };
}

/** spec 7: MF modifies rarity weights only */
export function rarityProbabilities(type: EncounterType, magicFind: number, rareWeightMult = 1): Record<Rarity, number> {
  const base = B.rarityWeights[type];
  const mf = Math.max(0, magicFind);
  const eff = mf / (B.mfConst + mf);
  const pU = base.unique * (1 + B.mfUnique * eff);
  const pR = base.rare * (1 + B.mfRare * eff) * rareWeightMult;
  const pM = base.magic * (1 + B.mfMagic * eff);
  const pN = 1 - pU - pR - pM;
  if (pN < 0) {
    const s = pU + pR + pM;
    return { normal: 0, magic: pM / s, rare: pR / s, unique: pU / s };
  }
  return { normal: pN, magic: pM, rare: pR, unique: pU };
}

export function expectedDropCount(type: EncounterType): number {
  const w = B.dropCountWeights[type];
  const tot = w.reduce((a, b) => a + b, 0);
  return w.reduce((s, x, i) => s + (i * x) / tot, 0);
}

/** P(>=1 unique candidate) per encounter — law of total probability over the item count */
export function pAtLeastOneUniqueCandidate(type: EncounterType, magicFind: number): number {
  const w = B.dropCountWeights[type];
  const tot = w.reduce((a, b) => a + b, 0);
  const pU = rarityProbabilities(type, magicFind).unique;
  return w.reduce((s, x, n) => s + (x / tot) * (1 - Math.pow(1 - pU, n)), 0);
}

export function rollDropCount(rng: Rng, type: EncounterType): number {
  return rng.weightedIndex(B.dropCountWeights[type]);
}

export function rollItemLevel(rng: Rng, type: EncounterType, monsterLevel: number): number {
  const [lo, hi] = B.ilvlOffset[type];
  return clamp(monsterLevel + rng.int(lo, hi), 1, 100);
}

export function rollRarity(rng: Rng, type: EncounterType, magicFind: number, rareWeightMult = 1): Rarity {
  const p = rarityProbabilities(type, magicFind, rareWeightMult);
  const order: Rarity[] = ['normal', 'magic', 'rare', 'unique'];
  return order[rng.weightedIndex(order.map((r) => p[r]))]!;
}

export function eligibleBases(ctx: Pick<DropContext, 'baseFamilies' | 'monsterLevel'>, group?: BaseGroup): ItemBase[] {
  const fams = new Set(ctx.baseFamilies);
  return BASES.filter((b) => fams.has(b.familyId) && b.minLevel <= ctx.monsterLevel && (!group || b.group === group));
}

/** base choice: group by zone weights (groups without bases renormalised away), family uniform, newest tier favoured (D-083) */
export function pickBase(rng: Rng, ctx: Pick<DropContext, 'baseFamilies' | 'monsterLevel' | 'baseWeights'>): ItemBase {
  const groups = (Object.keys(ctx.baseWeights) as BaseGroup[]).filter((g) => ctx.baseWeights[g] > 0 && eligibleBases(ctx, g).length > 0);
  if (groups.length === 0) throw new Error('No eligible bases for drop context');
  const g = groups[rng.weightedIndex(groups.map((x) => ctx.baseWeights[x]))]!;
  const bases = eligibleBases(ctx, g);
  const families = Array.from(new Set(bases.map((b) => b.familyId))).sort();
  const fam = families[rng.int(0, families.length - 1)]!;
  const tiers = bases.filter((b) => b.familyId === fam).sort((a, b) => a.tier - b.tier);
  const newest = tiers[tiers.length - 1]!.tier;
  return tiers[rng.weightedIndex(tiers.map((b) => (b.tier === newest ? B.baseNewestTierWeight : B.baseOlderTierWeight)))]!;
}

export function uniqueCandidatesFor(base: ItemBase, ilvl: number, bossId?: string): UniqueDef[] {
  return UNIQUES.filter((u) => u.baseId === base.id && u.minItemLevel <= ilvl && (u.dropSource === 'world' || u.dropSource === bossId));
}

export function blankItem(base: ItemBase, ilvl: number, rarity: Rarity, source: string): ItemInstance {
  return {
    uid: '', baseId: base.id, rarity, itemLevel: ilvl, prefixes: [], suffixes: [], sockets: 0, runes: [],
    corrupted: false, fractured: false, locked: false, favorite: false, source, history: [],
  };
}

export function affixRngs(seed: number, ...labels: (string | number)[]): AffixRngs {
  return {
    side: Rng.fromLabels(seed, 'side', ...labels),
    family: Rng.fromLabels(seed, 'fam', ...labels),
    tier: Rng.fromLabels(seed, 'tier', ...labels),
    value: Rng.fromLabels(seed, 'val', ...labels),
  };
}

export function fillAffixes(item: ItemInstance, count: number, rngs: AffixRngs): void {
  for (let k = 0; k < count; k++) if (!addRandomAffix(item, rngs)) break;
}

export function rareAffixCount(rng: Rng, ilvl: number, forceMin = 3): number {
  const counts = [3, 4, 5, 6].filter((c) => c >= forceMin && (ilvl >= B.rareLowIlvlThreshold || c <= Math.max(B.rareLowIlvlMaxAffixes, forceMin)));
  return counts[rng.weightedIndex(counts.map((c) => B.rareAffixCountWeights[c]!))]!;
}

export function magicAffixCount(rng: Rng): number {
  const counts = [1, 2];
  return counts[rng.weightedIndex(counts.map((c) => B.magicAffixCountWeights[c]!))]!;
}

export interface GeneratedItemOpts {
  forceRarity?: Rarity;
  forceBase?: ItemBase;
  rareMinAffixes?: number;
}

/** generate one item (index i within an encounter) */
export function generateItem(ctx: DropContext, i: number, tel: LootTelemetry, opts: GeneratedItemOpts = {}): ItemInstance {
  const ilvl = rollItemLevel(Rng.fromLabels(ctx.seed, 'ilvl', i), ctx.encounterType, ctx.monsterLevel);
  let rarity = opts.forceRarity ?? rollRarity(Rng.fromLabels(ctx.seed, 'quality', i), ctx.encounterType, ctx.magicFind, ctx.rareWeightMult);
  const base = opts.forceBase ?? pickBase(Rng.fromLabels(ctx.seed, 'base', i), ctx);
  const rngs = affixRngs(ctx.seed, i);
  tel.items++;
  if (rarity === 'unique') {
    tel.uniqueCandidates++;
    const pool = uniqueCandidatesFor(base, ilvl, ctx.bossId);
    if (pool.length > 0) {
      const uRng = Rng.fromLabels(ctx.seed, 'unique', i);
      const u = pool[uRng.int(0, pool.length - 1)]!;
      const item = blankItem(base, ilvl, 'unique', ctx.source);
      item.uniqueId = u.id;
      item.uniqueRolls = u.uniqueRolls.map((r) => (r.unit === 'int' ? uRng.int(r.min, r.max) : uRng.int(r.min * 10, r.max * 10) / 10));
      item.history.push({ action: 'drop', detail: `unique:${u.id}` });
      tel.uniqueDrops++;
      tel.byRarity.unique++;
      return item;
    }
    // spec 7: no eligible unique → rare with 6 affixes + failedUniqueRoll entry (no silent re-roll)
    tel.failedUniqueRolls++;
    rarity = 'rare';
    const item = blankItem(base, ilvl, 'rare', ctx.source);
    item.history.push({ action: 'failedUniqueRoll', detail: `no unique for ${base.id} ilvl${ilvl}` });
    fillAffixes(item, B.failedUniqueAffixCount, rngs);
    tel.byRarity.rare++;
    return item;
  }
  const item = blankItem(base, ilvl, rarity, ctx.source);
  item.history.push({ action: 'drop', detail: ctx.source });
  if (rarity === 'magic') fillAffixes(item, magicAffixCount(Rng.fromLabels(ctx.seed, 'count', i)), rngs);
  else if (rarity === 'rare') fillAffixes(item, rareAffixCount(Rng.fromLabels(ctx.seed, 'count', i), ilvl, opts.rareMinAffixes ?? 3), rngs);
  tel.byRarity[rarity]++;
  return item;
}

export function generateEncounterDrops(ctx: DropContext, tel: LootTelemetry = emptyTelemetry()): { items: ItemInstance[]; telemetry: LootTelemetry } {
  const n = rollDropCount(Rng.fromLabels(ctx.seed, 'count'), ctx.encounterType);
  const items: ItemInstance[] = [];
  for (let i = 0; i < n; i++) items.push(generateItem(ctx, i, tel));
  return { items, telemetry: tel };
}

export function requiredLevel(item: ItemInstance): number {
  const base = getBase(item.baseId);
  let req = base.minLevel;
  for (const a of [...item.prefixes, ...item.suffixes]) {
    if (a.tier === 1) req = Math.max(req, 60);
    if (a.tier === 0) req = Math.max(req, 80);
  }
  return req;
}

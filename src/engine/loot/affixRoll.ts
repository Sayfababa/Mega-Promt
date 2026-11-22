/**
 * Affix eligibility + rolling (spec 5/6/7.1). Shared by loot generation and crafting.
 * Selection: family by family weight first, then tier among ALLOWED tiers (renormalised) —
 * never draw an invalid tier and discard it.
 */
import { B } from '../../content/balance';
import { AFFIXES, AFFIX_BY_ID } from '../../content/affixes/affixes';
import { getBase } from '../../content/bases/bases';
import { round1, roundHalfUp } from '../core/fixedPoint';
import type { Rng } from '../core/rng';
import type { AffixFamily, AffixInstance, AffixSide, EssenceType, ItemBase, ItemInstance, Rarity } from '../types';

export const TIERS = [5, 4, 3, 2, 1] as const;

export interface AffixRngs {
  side: Rng;
  family: Rng;
  tier: Rng;
  value: Rng;
}

export function usedGroups(item: Pick<ItemInstance, 'prefixes' | 'suffixes'>): Set<string> {
  const s = new Set<string>();
  for (const a of [...item.prefixes, ...item.suffixes]) {
    const f = AFFIX_BY_ID[a.familyId];
    if (f) s.add(f.groupId);
  }
  return s;
}

export function familyAllowedOnBase(f: AffixFamily, base: ItemBase): boolean {
  if (f.kinds && !f.kinds.includes(base.kind)) return false;
  return f.categories.some((c) => base.categories.includes(c));
}

export function allowedTiers(f: AffixFamily, ilvl: number): number[] {
  if (f.noTiers) return ilvl >= f.minItemLevel ? [3] : [];
  return TIERS.filter((t) => ilvl >= B.affixTierMinIlvl[t]!);
}

export function eligibleFamilies(
  item: Pick<ItemInstance, 'baseId' | 'itemLevel' | 'prefixes' | 'suffixes'>,
  side: AffixSide,
  opts: { essence?: EssenceType; extraExcludedGroups?: Set<string> } = {},
): AffixFamily[] {
  const base = getBase(item.baseId);
  const used = usedGroups(item);
  return AFFIXES.filter((f) => {
    if (f.side !== side) return false;
    if (!familyAllowedOnBase(f, base)) return false;
    if (item.itemLevel < f.minItemLevel) return false;
    if (used.has(f.groupId)) return false;
    if (opts.extraExcludedGroups?.has(f.groupId)) return false;
    if (opts.essence && !f.essenceTags.includes(opts.essence)) return false;
    return allowedTiers(f, item.itemLevel).length > 0;
  });
}

export function tierWeights(f: AffixFamily, ilvl: number): { tier: number; p: number }[] {
  const tiers = allowedTiers(f, ilvl);
  if (f.noTiers) return tiers.map((t) => ({ tier: t, p: 1 }));
  const total = tiers.reduce((s, t) => s + B.affixTierWeight[t]!, 0);
  return tiers.map((t) => ({ tier: t, p: B.affixTierWeight[t]! / total }));
}

/** value range of roll `idx` at `tier` (tier factor applied, rounded per unit) */
export function tierRange(f: AffixFamily, idx: number, tier: number): { min: number; max: number } {
  const r = f.rolls[idx]!;
  const fac = f.noTiers ? 1 : B.affixTierFactor[tier] ?? 1;
  const rnd = r.unit === 'int' ? roundHalfUp : round1;
  let lo = rnd(r.min * fac);
  let hi = rnd(r.max * fac);
  if (lo > hi) [lo, hi] = [hi, lo];
  if (r.unit === 'int' && lo < 1 && r.min >= 1) lo = 1;
  if (hi < lo) hi = lo;
  return { min: lo, max: hi };
}

export function rollValues(f: AffixFamily, tier: number, rng: Rng): number[] {
  const vals = f.rolls.map((r, i) => {
    const { min, max } = tierRange(f, i, tier);
    return r.unit === 'int' ? rng.int(min, max) : rng.int(Math.round(min * 10), Math.round(max * 10)) / 10;
  });
  // paired min/max damage: enforce min <= max
  if (vals.length === 2 && f.mods.length === 2 && vals[0]! > vals[1]!) vals[0] = vals[1]!;
  return vals;
}

export function rollAffix(f: AffixFamily, ilvl: number, rngs: Pick<AffixRngs, 'tier' | 'value'>, forcedTier?: number): AffixInstance {
  let tier: number;
  if (forcedTier !== undefined) tier = forcedTier;
  else {
    const tw = tierWeights(f, ilvl);
    const idx = rngs.tier.weightedIndex(tw.map((x) => x.p));
    tier = tw[idx]!.tier;
  }
  return { familyId: f.id, tier, values: rollValues(f, tier, rngs.value) };
}

export function maxAffixes(rarity: Rarity): { prefix: number; suffix: number } {
  return { prefix: B.maxPrefixes[rarity], suffix: B.maxSuffixes[rarity] };
}

export function openSlots(item: ItemInstance): { prefix: number; suffix: number } {
  const m = maxAffixes(item.rarity);
  return { prefix: Math.max(0, m.prefix - item.prefixes.length), suffix: Math.max(0, m.suffix - item.suffixes.length) };
}

/**
 * Adds one random affix. Side chosen proportional to open slots that still have a non-empty pool
 * (spec 8.1 "Ergänzen": Präfix/Suffix proportional zu offenen Slots). Returns null if no pool.
 */
export function addRandomAffix(
  item: ItemInstance,
  rngs: AffixRngs,
  opts: { side?: AffixSide; essence?: EssenceType; extraExcludedGroups?: Set<string> } = {},
): AffixInstance | null {
  const open = openSlots(item);
  const sides: AffixSide[] = opts.side ? [opts.side] : ['prefix', 'suffix'];
  const candidates = sides.filter((s) => open[s] > 0 && eligibleFamilies(item, s, opts).length > 0);
  if (candidates.length === 0) return null;
  const side = candidates.length === 1 ? candidates[0]! : candidates[rngs.side.weightedIndex(candidates.map((s) => open[s]))]!;
  const pool = eligibleFamilies(item, side, opts);
  const fam = rngs.family.pickWeighted(pool, (f) => f.weight)!;
  const inst = rollAffix(fam, item.itemLevel, rngs);
  if (side === 'prefix') item.prefixes.push(inst);
  else item.suffixes.push(inst);
  return inst;
}

/** exact probability preview for "add one random affix" (spec 7.1, crafting preview) */
export function addAffixOdds(
  item: ItemInstance,
  opts: { side?: AffixSide; essence?: EssenceType } = {},
): { familyId: string; name: string; side: AffixSide; p: number; tiers: { tier: number; p: number }[] }[] {
  const open = openSlots(item);
  const sides: AffixSide[] = opts.side ? [opts.side] : ['prefix', 'suffix'];
  const candidates = sides.filter((s) => open[s] > 0 && eligibleFamilies(item, s, opts).length > 0);
  if (candidates.length === 0) return [];
  const sideTotal = candidates.reduce((s, c) => s + open[c], 0);
  const out: ReturnType<typeof addAffixOdds> = [];
  for (const side of candidates) {
    const pSide = candidates.length === 1 ? 1 : open[side] / sideTotal;
    const pool = eligibleFamilies(item, side, opts);
    const wTot = pool.reduce((s, f) => s + f.weight, 0);
    for (const f of pool) out.push({ familyId: f.id, name: f.name, side, p: pSide * (f.weight / wTot), tiers: tierWeights(f, item.itemLevel) });
  }
  return out.sort((a, b) => b.p - a.p);
}

export function formatAffix(inst: AffixInstance): string {
  const f = AFFIX_BY_ID[inst.familyId];
  if (!f) return inst.familyId;
  return f.text.replace(/\{(\d)\}/g, (_, i: string) => String(inst.values[Number(i)] ?? '?'));
}

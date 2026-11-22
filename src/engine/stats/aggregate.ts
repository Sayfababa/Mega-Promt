/**
 * Character stat aggregation (spec 3.1 / 3.2 / 4).
 * Order: local weapon/armour stats → collect global modifiers (implicits, affixes, uniques, passives)
 * → attributes → derived values. Caps are applied at use-time (see stats/combatStats.ts) so that
 * uncapped values (e.g. resistances vs penetration) are preserved.
 */
import { B } from '../../content/balance';
import { getBase } from '../../content/bases/bases';
import { AFFIX_BY_ID } from '../../content/affixes/affixes';
import { UNIQUE_BY_ID } from '../../content/uniques/uniques';
import { CLASS_BY_ID } from '../../content/classes/classes';
import { PASSIVE_TREES } from '../../content/passives/guardian';
import type {
  AffixInstance, DamageType, EquipSlot, ItemBase, ItemInstance, LocalStat, Modifier, ScalarStat, SpecialRules, TriggerDef,
} from '../types';

export type StatMap = Partial<Record<ScalarStat, number>>;

export interface WeaponProfile {
  min: number;
  max: number;
  aps: number;          // local APS (before global attack speed)
  crit: number;         // base + local crit
  hands: 1 | 2;
  elemental: Partial<Record<DamageType, { min: number; max: number }>>;
  familyId: string;
  casterEligible: boolean;
}

export interface CharacterInput {
  classId: string;
  level: number;
  allocated: { str: number; dex: number; int: number; vit: number };
  equipment: Partial<Record<EquipSlot, ItemInstance | null>>;
  passives: string[];
}

export interface DerivedStats {
  level: number;
  str: number; dex: number; int: number; vit: number;
  maxHP: number;
  maxMana: number;
  armorFlat: number;          // sum of local item armour + global flat
  weapon: WeaponProfile;
  hasShield: boolean;
  stats: StatMap;             // unconditional scalar stats (sums)
  conditionalStats: (Modifier & { type: 'stat' })[];
  incMods: (Modifier & { type: 'inc' })[];
  moreMods: (Modifier & { type: 'more' })[];
  triggers: TriggerDef[];
  special: SpecialRules;
  hpRegen: number;            // per second
  manaRegen: number;          // per second
  uniqueIds: string[];
}

export const UNARMED: WeaponProfile = {
  min: 2, max: 4, aps: 1.2, crit: 0.05, hands: 1, elemental: {}, familyId: 'unarmed', casterEligible: false,
};

function addStat(map: StatMap, stat: ScalarStat, value: number): void {
  map[stat] = (map[stat] ?? 0) + value;
}

/** materialise affix instance → (local stats, global modifiers) */
export function affixModifiers(inst: AffixInstance): { local: { stat: LocalStat; value: number }[]; global: Modifier[] } {
  const fam = AFFIX_BY_ID[inst.familyId];
  if (!fam) throw new Error(`Unknown affix ${inst.familyId}`);
  const local: { stat: LocalStat; value: number }[] = [];
  const global: Modifier[] = [];
  for (const t of fam.mods) {
    const v = (inst.values[t.roll] ?? 0) * t.scale;
    if (t.type === 'local') local.push({ stat: t.stat, value: v });
    else if (t.type === 'stat') global.push({ type: 'stat', stat: t.stat, value: v });
    else global.push({ type: 'inc', tags: t.tags, value: v });
  }
  return { local, global };
}

export function uniqueModifiers(item: ItemInstance): Modifier[] {
  if (!item.uniqueId) return [];
  const u = UNIQUE_BY_ID[item.uniqueId];
  if (!u) return [];
  return u.mods.map((m) => {
    const { rollIndex, ...rest } = m;
    if (rollIndex === undefined) return rest as Modifier;
    const roll = item.uniqueRolls?.[rollIndex] ?? u.uniqueRolls[rollIndex]?.min ?? 0;
    return { ...rest, value: m.value * roll } as Modifier;
  });
}

function allAffixes(item: ItemInstance): AffixInstance[] {
  return [...item.prefixes, ...item.suffixes];
}

/** spec 3.2 local weapon computation */
export function weaponProfile(item: ItemInstance | null | undefined): WeaponProfile {
  if (!item) return UNARMED;
  const base = getBase(item.baseId);
  if (!base.weapon) return UNARMED;
  const loc: Partial<Record<LocalStat, number>> = {};
  for (const a of allAffixes(item)) for (const l of affixModifiers(a).local) loc[l.stat] = (loc[l.stat] ?? 0) + l.value;
  const inc = 1 + (loc.physInc ?? 0);
  const elemental: WeaponProfile['elemental'] = {};
  for (const el of ['fire', 'cold', 'lightning'] as const) {
    const mn = loc[`${el}FlatMin` as LocalStat] ?? 0;
    const mx = loc[`${el}FlatMax` as LocalStat] ?? 0;
    if (mn > 0 || mx > 0) elemental[el] = { min: mn, max: Math.max(mn, mx) };
  }
  return {
    min: (base.weapon.min + (loc.physFlatMin ?? 0)) * inc,
    max: (base.weapon.max + (loc.physFlatMax ?? 0)) * inc,
    aps: base.weapon.aps * (1 + (loc.attackSpeed ?? 0)),
    crit: base.weapon.crit + (loc.crit ?? 0),
    hands: base.weapon.hands,
    elemental,
    familyId: base.familyId,
    casterEligible: base.weapon.casterEligible,
  };
}

/** local armour of a single item: (base + local flat) * (1 + local %) */
export function itemArmour(item: ItemInstance, base: ItemBase): number {
  if (!base.armour) return 0;
  let inc = 0;
  for (const a of allAffixes(item)) for (const l of affixModifiers(a).local) if (l.stat === 'armorInc') inc += l.value;
  return base.armour * (1 + inc);
}

export function collectItemModifiers(item: ItemInstance): Modifier[] {
  const base = getBase(item.baseId);
  const mods: Modifier[] = [...base.implicits];
  for (const a of allAffixes(item)) mods.push(...affixModifiers(a).global);
  mods.push(...uniqueModifiers(item));
  return mods;
}

export function aggregate(input: CharacterInput): DerivedStats {
  const cls = CLASS_BY_ID[input.classId];
  if (!cls) throw new Error(`Unknown class ${input.classId}`);
  const L = Math.max(1, Math.min(B.maxLevel, input.level));

  const stats: StatMap = {};
  const conditionalStats: DerivedStats['conditionalStats'] = [];
  const incMods: DerivedStats['incMods'] = [];
  const moreMods: DerivedStats['moreMods'] = [];
  const triggers: TriggerDef[] = [];
  const special: SpecialRules = {};
  const uniqueIds: string[] = [];
  let moreMaxHP = 1;
  let armorFlat = 0;

  const push = (m: Modifier): void => {
    if (m.type === 'stat') {
      if (m.cond) conditionalStats.push(m);
      else if (m.stat === 'moreMaxHP') moreMaxHP *= 1 + m.value;
      else addStat(stats, m.stat, m.value);
    } else if (m.type === 'inc') incMods.push(m);
    else moreMods.push(m);
  };

  const mainhand = input.equipment.mainhand ?? null;
  const offhand = input.equipment.offhand ?? null;
  let hasShield = false;

  for (const [slot, item] of Object.entries(input.equipment) as [EquipSlot, ItemInstance | null][]) {
    if (!item) continue;
    const base = getBase(item.baseId);
    // two-hander blocks offhand (validated by commands; defensive here)
    if (slot === 'offhand' && mainhand && getBase(mainhand.baseId).weapon?.hands === 2) continue;
    if (slot === 'offhand' && base.offhandKind === 'shield') hasShield = true;
    armorFlat += itemArmour(item, base);
    for (const m of collectItemModifiers(item)) push(m);
    if (item.uniqueId) {
      const u = UNIQUE_BY_ID[item.uniqueId];
      if (u) {
        uniqueIds.push(u.id);
        for (const tr of u.triggers) {
          const roll = tr.rollIndex !== undefined ? item.uniqueRolls?.[tr.rollIndex] : undefined;
          if (roll === undefined) { triggers.push(tr); continue; }
          const e = tr.effect;
          const effect = e.kind === 'reflectPhysical' ? { ...e, fraction: roll / 100 }
            : e.kind === 'gainBarrierPctMaxHp' || e.kind === 'nextAttackInc' ? { ...e, value: roll / 100 }
            : e.kind === 'counterWeaponHit' ? { ...e, coefficient: roll / 100 } : e;
          triggers.push({ ...tr, effect });
        }
        if (u.special?.finisherMoreAtBleedStacks) {
          const roll = item.uniqueRolls?.[0];
          special.finisherMoreAtBleedStacks = {
            stacks: u.special.finisherMoreAtBleedStacks.stacks,
            more: roll !== undefined ? roll / 100 : u.special.finisherMoreAtBleedStacks.more,
          };
        }
      }
    }
  }
  void offhand;

  const tree = PASSIVE_TREES[cls.passiveTree] ?? [];
  for (const id of input.passives) {
    const node = tree.find((n) => n.id === id);
    if (node) for (const m of node.mods) push(m);
  }

  // attributes
  const attr = (k: 'str' | 'dex' | 'int' | 'vit', incKey: ScalarStat): number =>
    Math.floor((cls.start[k] + cls.perLevel[k] * (L - 1) + input.allocated[k] + (stats[k] ?? 0)) * (1 + (stats[incKey] ?? 0)));
  const str = attr('str', 'incStr');
  const dex = attr('dex', 'incDex');
  const int = attr('int', 'incInt');
  const vit = attr('vit', 'incVit');

  // attribute-derived bonuses (spec 3.1)
  const fl = B.attributeFloor;
  if (str > fl) incMods.push({ type: 'inc', tags: ['PHYSICAL'], value: B.physIncPerStr * (str - fl) });
  if (int > fl) incMods.push({ type: 'inc', tags: ['SPELL'], value: B.spellIncPerInt * (int - fl) });
  addStat(stats, 'attackSpeed', B.attackSpeedPerDex * Math.max(dex - fl, 0));
  addStat(stats, 'critChance', B.critPerDex * Math.max(dex - fl, 0));

  const maxHP = Math.max(1, Math.floor(
    Math.floor((B.hpBase + B.hpPerLevel * (L - 1) + B.hpPerVit * vit + (stats.flatHP ?? 0)) * (1 + (stats.incMaxHP ?? 0))) * moreMaxHP,
  ));
  const maxMana = Math.max(0, Math.floor((B.manaBase + B.manaPerLevel * (L - 1) + B.manaPerInt * int + (stats.flatMana ?? 0)) * (1 + (stats.incMana ?? 0))));
  armorFlat += stats.flatArmor ?? 0;

  const hpRegen = B.hpRegenPctPerSec * maxHP + (stats.hpRegenFlat ?? 0);
  const manaRegen = (B.manaRegenBase + B.manaRegenPctPerSec * maxMana) * (1 + (stats.manaRegen ?? 0));

  return {
    level: L, str, dex, int, vit, maxHP, maxMana, armorFlat,
    weapon: weaponProfile(mainhand), hasShield,
    stats, conditionalStats, incMods, moreMods, triggers, special, hpRegen, manaRegen, uniqueIds,
  };
}

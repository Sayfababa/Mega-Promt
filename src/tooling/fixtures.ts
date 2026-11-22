/**
 * Reference builds for balance simulation (spec 15 / 18). Items are "plausible, not perfect":
 * affixes use the MIDPOINT of the tier range allowed by the item level, the newest base tier for the
 * level, and a documented affix budget per stage. No hidden defence bonuses.
 */
import { AFFIX_BY_ID } from '../content/affixes/affixes';
import { B } from '../content/balance';
import { tierRange } from '../engine/loot/affixRoll';
import { aggregate, type DerivedStats } from '../engine/stats/aggregate';
import { playerCombatant } from '../engine/combat/combatants';
import type { CombatantSpec } from '../engine/combat/simulate';
import type { AffixInstance, EquipSlot, ItemInstance, PriorityRule, Rarity } from '../engine/types';

export interface BuildFixture {
  id: string;
  name: string;
  stage: string;
  level: number;
  budget: string;
  player: CombatantSpec;
  derived: DerivedStats;
}

function bestTier(ilvl: number): number {
  return [1, 2, 3, 4, 5].find((t) => ilvl >= B.affixTierMinIlvl[t]!) ?? 5;
}

/** affix at the midpoint of its tier range, one tier below the best allowed (plausible drop) */
function mid(familyId: string, ilvl: number, tierOffset = 1): AffixInstance {
  const f = AFFIX_BY_ID[familyId]!;
  const tier = Math.min(5, bestTier(ilvl) + tierOffset);
  const values = f.rolls.map((r, i) => {
    const { min, max } = tierRange(f, i, tier);
    const v = (min + max) / 2;
    return r.unit === 'int' ? Math.round(v) : Math.round(v * 10) / 10;
  });
  return { familyId, tier, values };
}

function item(baseId: string, ilvl: number, rarity: Rarity, prefixes: string[], suffixes: string[], tierOffset = 1): ItemInstance {
  return {
    uid: baseId, baseId, rarity, itemLevel: ilvl,
    prefixes: prefixes.map((p) => mid(p, ilvl, tierOffset)), suffixes: suffixes.map((s) => mid(s, ilvl, tierOffset)),
    sockets: 0, runes: [], corrupted: false, fractured: false, locked: false, favorite: false, source: 'fixture', history: [],
  };
}

function tierFor(level: number): number {
  return [6, 5, 4, 3, 2, 1].find((t) => B.baseTierMinLevel[t - 1]! <= level) ?? 1;
}

type Archetype = 'bleed2h' | 'block1h';

const SKILLS: Record<Archetype, { active: string[]; priority: PriorityRule[]; passives: string[] }> = {
  bleed2h: {
    active: ['g_cleave', 'g_bloodharvest', 'g_armorbreak', 'g_battlefury'],
    priority: [
      { skillId: 'g_battlefury', condition: 'buffMissing' },
      { skillId: 'g_armorbreak', condition: 'buffMissing' },
      { skillId: 'g_bloodharvest', condition: 'targetBleedStacks3' },
      { skillId: 'g_cleave', condition: 'always' },
    ],
    passives: ['g_root', 'g_s_phys', 'g_s_bleed', 'g_m_bleed', 'g_k_bloodcourt', 'g_s_speed', 'g_k_berserker', 'g_s_hp', 'g_s_regen', 'g_s_armor', 'g_s_block', 'g_m_shield', 'g_s_res'],
  },
  block1h: {
    active: ['g_cleave', 'g_shieldwall', 'g_armorbreak', 'g_lastbulwark'],
    priority: [
      { skillId: 'g_lastbulwark', condition: 'selfHpBelow40' },
      { skillId: 'g_shieldwall', condition: 'barrierBelow15' },
      { skillId: 'g_armorbreak', condition: 'buffMissing' },
      { skillId: 'g_cleave', condition: 'always' },
    ],
    passives: ['g_root', 'g_s_armor', 'g_s_block', 'g_m_shield', 'g_k_ironheart', 'g_s_res', 'g_s_hp', 'g_s_regen', 'g_s_phys', 'g_s_bleed', 'g_m_bleed', 'g_s_speed', 'g_k_bloodcourt'],
  },
};

/** talent points spent in documented order up to the level's budget */
function passivesFor(arch: Archetype, level: number): string[] {
  const pts = level - 1 + B.specPointLevels.filter((l) => level >= l).length;
  return SKILLS[arch].passives.slice(0, pts + 1);
}

function skillsFor(arch: Archetype, level: number): { active: string[]; priority: PriorityRule[] } {
  const unlock: Record<string, number> = { g_cleave: 1, g_armorbreak: 2, g_shieldwall: 4, g_bloodharvest: 6, g_battlefury: 8, g_lastbulwark: 10 };
  const active = SKILLS[arch].active.filter((s) => unlock[s]! <= level);
  return { active, priority: SKILLS[arch].priority.filter((r) => active.includes(r.skillId)) };
}

/**
 * Item budget per stage:
 *  start (L1):  starter normal gear only.
 *  early (L≤15): magic weapon (1 offensive prefix + 1 suffix), magic chest/helm (life + res), 1 magic ring/amulet.
 *  endgame (L60): rare weapon 4 mods, rare armour 3 mods, rare jewellery 3 mods; one tier below max.
 */
export function buildFixture(arch: Archetype, level: number, stage: 'start' | 'early' | 'endgame'): BuildFixture {
  const t = tierFor(level);
  const ilvl = level;
  const eq: Partial<Record<EquipSlot, ItemInstance>> = {};
  let budget = '';
  const weaponBase = arch === 'bleed2h' ? `greataxe_t${t}` : `longsword_t${t}`;
  if (stage === 'start') {
    eq.mainhand = item(arch === 'bleed2h' ? 'greataxe_t1' : 'shortsword_t1', 1, 'normal', [], []);
    eq.chest = item('chest_plate_t1', 1, 'normal', [], []);
    if (arch === 'block1h') eq.offhand = item('shield_t1', 1, 'normal', [], []);
    budget = 'Startausrüstung (normal); Block-Variante mit normalem Schild';
  } else if (stage === 'early') {
    eq.mainhand = item(weaponBase, ilvl, 'magic', ['p01'], [arch === 'bleed2h' ? 's05' : 's01']);
    eq.chest = item(`chest_plate_t${t}`, ilvl, 'magic', ['p13'], ['s14']);
    eq.helm = item(`helm_plate_t${t}`, ilvl, 'magic', ['p15'], ['s04']);
    eq.ringA = item('ring_onyx', ilvl, 'magic', ['p07'], ['s14']);
    eq.amulet = item('amulet_str', ilvl, 'magic', ['p13'], ['s01']);
    if (arch === 'block1h') eq.offhand = item(`shield_t${t}`, ilvl, 'magic', ['p13'], ['s16']);
    budget = '5–6 magische Items, je 1 Präfix + 1 Suffix, Mittelwert eine Stufe unter Max-Tier';
  } else {
    eq.mainhand = item(weaponBase, ilvl, 'rare', ['p01', 'p02'], ['s05', 's08']);
    eq.chest = item(`chest_plate_t${t}`, ilvl, 'rare', ['p13', 'p15'], ['s14']);
    eq.helm = item(`helm_plate_t${t}`, ilvl, 'rare', ['p13', 'p15'], ['s11']);
    eq.gloves = item(`gloves_plate_t${t}`, ilvl, 'rare', ['p13'], ['s12', 's01']);
    eq.boots = item(`boots_plate_t${t}`, ilvl, 'rare', ['p13'], ['s13', 's04']);
    eq.belt = item(`belt_t${t}`, ilvl, 'rare', ['p13', 'p07'], ['s01']);
    eq.ringA = item('ring_onyx', ilvl, 'rare', ['p07'], ['s14', 's02']);
    eq.ringB = item('ring_ruby', ilvl, 'rare', ['p07'], ['s12', 's01']);
    eq.amulet = item('amulet_str', ilvl, 'rare', ['p07', 'p13'], ['s10']);
    if (arch === 'block1h') eq.offhand = item(`shield_t${t}`, ilvl, 'rare', ['p13', 'p15'], ['s16', 's15']);
    budget = 'Rares: Waffe 4 Mods, Rüstung/Schmuck 3 Mods; Mittelwerte eine Stufe unter Max-Tier; keine Uniques';
  }
  // attribute points: bleed → STR, block → VIT (2 per level)
  const pts = (level - 1) * B.freeAttributePointsPerLevel;
  const allocated = arch === 'bleed2h' ? { str: Math.ceil(pts / 2), dex: 0, int: 0, vit: Math.floor(pts / 2) } : { str: Math.floor(pts / 4), dex: 0, int: 0, vit: pts - Math.floor(pts / 4) };
  const passives = passivesFor(arch, level);
  const derived = aggregate({ classId: 'guardian', level, allocated, equipment: eq, passives });
  const sk = skillsFor(arch, level);
  const name = arch === 'bleed2h' ? 'Blutungs-Wächter (2H)' : 'Block-Wächter (1H+Schild)';
  return { id: `${arch}_${stage}_L${level}`, name, stage, level, budget, derived, player: playerCombatant(name, derived, sk.active, sk.priority) };
}

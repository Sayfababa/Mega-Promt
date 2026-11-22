/** Builds combatant specs (player from DerivedStats, monsters from content + scaling). */
import { B } from '../../content/balance';
import { SKILL_BY_ID } from '../../content/skills/guardian';
import type { DerivedStats } from '../stats/aggregate';
import { UNARMED } from '../stats/aggregate';
import type { CombatantSpec } from './simulate';
import { monsterBasicHit, monsterStats } from './monsterScaling';
import type { EncounterType, MonsterDef, PriorityRule } from '../types';

export function defaultPriority(activeSkills: string[]): PriorityRule[] {
  const order = ['g_lastbulwark', 'g_shieldwall', 'g_battlefury', 'g_armorbreak', 'g_bloodharvest', 'g_cleave'];
  const rules: PriorityRule[] = [];
  for (const id of order) if (activeSkills.includes(id)) rules.push({ skillId: id, condition: SKILL_BY_ID[id]!.defaultCondition });
  for (const id of activeSkills) if (!order.includes(id) && SKILL_BY_ID[id]) rules.push({ skillId: id, condition: SKILL_BY_ID[id]!.defaultCondition });
  return rules;
}

export function playerCombatant(name: string, derived: DerivedStats, activeSkills: string[], priority: PriorityRule[]): CombatantSpec {
  return { id: 'player', name, side: 'player', level: derived.level, isBoss: false, derived, activeSkills, priority };
}

export interface MonsterInstanceSpec {
  def: MonsterDef;
  level: number;
  encounterType: EncounterType;
  hpMult?: number;
  dpsMult?: number;
  index?: number;
}

export function monsterCombatant(m: MonsterInstanceSpec): CombatantSpec & { rawDps: number } {
  const st = monsterStats(m.def, m.level, m.encounterType, m.hpMult ?? 1, m.dpsMult ?? 1);
  const derived: DerivedStats = {
    level: m.level, str: 10, dex: 10, int: 10, vit: 10,
    maxHP: st.maxHP, maxMana: 0, armorFlat: st.armor,
    weapon: UNARMED, hasShield: false,
    stats: {}, conditionalStats: [], incMods: [], moreMods: [], triggers: [], special: {},
    hpRegen: 0, manaRegen: 0, uniqueIds: [],
  };
  return {
    id: `enemy${m.index ?? 0}`,
    name: m.def.name,
    side: 'enemy',
    level: m.level,
    isBoss: m.encounterType === 'boss' || m.encounterType === 'riftboss',
    derived,
    monster: m.def,
    monsterHit: monsterBasicHit(m.def, st.rawDps),
    rawDps: st.rawDps,
  };
}

export const COMBAT_LIMITS = { normal: B.maxCombatMs, boss: B.maxBossCombatMs };

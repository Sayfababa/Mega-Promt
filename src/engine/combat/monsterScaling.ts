import { B } from '../../content/balance';
import type { MonsterDef, EncounterType } from '../types';

type AnchorKey = 'hp' | 'bossHp' | 'dps' | 'bossDps';

/** spec 13.1a log interpolation between anchors; controlled extrapolation at the ends */
export function anchorValue(level: number, key: AnchorKey): number {
  const a = B.monsterAnchors;
  const L = Math.max(1, Math.min(100, level));
  let i = 0;
  while (i < a.length - 2 && L > a[i + 1]!.level) i++;
  const lo = a[i]!;
  const hi = a[i + 1]!;
  const t = (L - lo.level) / (hi.level - lo.level);
  return Math.round(Math.exp(Math.log(lo[key]) * (1 - t) + Math.log(hi[key]) * t));
}

export interface MonsterStats {
  maxHP: number;
  rawDps: number;
  armor: number;
}

export function monsterStats(def: MonsterDef, level: number, encounterType: EncounterType, hpMult = 1, dpsMult = 1): MonsterStats {
  const arch = B.archetype[def.archetype];
  const isBoss = encounterType === 'boss' || encounterType === 'riftboss';
  let hp = isBoss ? anchorValue(level, 'bossHp') : anchorValue(level, 'hp');
  let dps = isBoss ? anchorValue(level, 'bossDps') : anchorValue(level, 'dps');
  if (encounterType === 'elite') {
    hp *= B.eliteHpFactor;
    dps *= B.eliteDpsFactor;
  }
  hp = Math.round(hp * arch.hp * hpMult);
  dps = dps * arch.dps * dpsMult;
  return { maxHP: Math.max(1, hp), rawDps: dps, armor: Math.round(def.armorPerLevel * level) };
}

/**
 * Basic hit size so that the AVERAGE raw DPS (basic attacks + abilities + crits) equals the budget.
 * avgDps = hit * (aps + Σ k_i / T_i) * (1 + crit*(critMulti-1))
 */
export function monsterBasicHit(def: MonsterDef, rawDps: number): number {
  let rate = def.attackSpeed;
  for (const ab of def.abilities) rate += ab.hitMultiple / (ab.everyMs / 1000);
  const critFactor = 1 + def.critChance * (B.baseCritMulti - 1);
  return rawDps / (rate * critFactor);
}

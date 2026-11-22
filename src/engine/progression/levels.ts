import { B } from '../../content/balance';
import type { EncounterType } from '../types';

/** spec 2: xpNext(L) = floor(85 * L^1.45) for 1 <= L < 100 */
export function xpNext(level: number): number {
  if (level >= B.maxLevel) return Infinity;
  return Math.floor(B.xpNextBase * Math.pow(level, B.xpNextExp));
}

/** spec 2: encounter XP incl. rank multiplier and level-difference factor */
export function encounterXp(monsterLevel: number, type: EncounterType, playerLevel: number): number {
  const base = Math.round(B.encounterXpBase + B.encounterXpFactor * Math.pow(monsterLevel, B.encounterXpExp));
  let xp = base * B.xpRankMult[type];
  const diff = playerLevel - monsterLevel;
  if (diff >= B.xpOverlevelThreshold) {
    xp *= Math.max(B.xpOverlevelMin, 1 - 0.1 * (diff - B.xpOverlevelOffset));
  }
  // D-053: monsters > 5 levels above the player: XP capped at 1.5x of the same encounter at player level
  if (monsterLevel - playerLevel > B.xpUnderlevelGap) {
    const ref = Math.round(B.encounterXpBase + B.encounterXpFactor * Math.pow(playerLevel, B.encounterXpExp)) * B.xpRankMult[type];
    xp = Math.min(xp, ref * B.xpUnderlevelCap);
  }
  return Math.round(xp);
}

export function applyXp(level: number, xp: number, gained: number): { level: number; xp: number; levelsGained: number } {
  let l = level;
  let x = xp + gained;
  let gainedLevels = 0;
  while (l < B.maxLevel && x >= xpNext(l)) {
    x -= xpNext(l);
    l++;
    gainedLevels++;
  }
  if (l >= B.maxLevel) x = 0;
  return { level: l, xp: x, levelsGained: gainedLevels };
}

export function encounterGold(monsterLevel: number, type: EncounterType): number {
  return Math.round((B.goldBase + B.goldFactor * Math.pow(monsterLevel, B.goldExp)) * B.goldRankMult[type]);
}

export function talentPointsForLevel(level: number): number {
  let pts = (level - 1) * B.talentPointsPerLevel;
  for (const l of B.specPointLevels) if (level >= l) pts += 1;
  return pts;
}

export function respecPointCost(level: number): number {
  return Math.ceil(B.respecPointBase * Math.pow(Math.max(1, level), B.respecPointExp));
}

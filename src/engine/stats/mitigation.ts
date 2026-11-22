/** Central mitigation library (spec 3.1 / 3.3). No UI code may re-implement these. */
import { B } from '../../content/balance';
import { clamp } from '../core/fixedPoint';

/** physicalReduction = min(0.70, armor/(armor + 450 + 25*attackerLevel)) */
export function physicalReduction(armor: number, attackerLevel: number): number {
  const a = Math.max(0, armor);
  if (a <= 0) return 0;
  return Math.min(B.armorMaxReduction, a / (a + B.armorConst + B.armorPerAttackerLevel * attackerLevel));
}

/** effectiveRes = clamp(uncappedResistance - penetration, -0.5, 0.75) */
export function effectiveResistance(uncapped: number, penetration: number): number {
  return clamp(uncapped - penetration, B.caps.resMin, B.caps.resMax);
}

export function capCrit(c: number): number {
  return clamp(c, B.caps.critMin, B.caps.critMax);
}

export function capCritMulti(bonus: number): number {
  return Math.min(B.caps.critMultiMax, B.baseCritMulti + bonus);
}

export function capBlock(c: number): number {
  return clamp(c, 0, B.caps.blockMax);
}

export function capBlockPower(p: number): number {
  return clamp(p, 0, B.caps.blockPowerMax);
}

export function capEvasion(e: number): number {
  return clamp(e, 0, B.caps.evasionMax);
}

export function capAps(aps: number): number {
  return clamp(aps, B.caps.apsMin, B.caps.apsMax);
}

export function capCdr(c: number): number {
  return clamp(c, 0, B.caps.cdrMax);
}

export function capLeech(l: number): number {
  return clamp(l, 0, B.caps.lifeLeechMax);
}

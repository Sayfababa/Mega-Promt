/**
 * Rifts (spec 14). Vertical slice: scaling functions, modifier pool, rift config builder for the
 * "Rift-Probe" (debug / build lab only — UI keeps rifts locked until level 60).
 * Rule: rift monsters ALWAYS use Lv60 anchors × rift multiplier (no double scaling, spec 13.1a).
 */
import { B } from '../../content/balance';
import { SLICE_BASE_FAMILIES } from '../../content/dungeons/dungeons';
import { Rng } from '../core/rng';
import type { EncounterDef } from '../types';
import type { RunConfig } from '../run/run';

export const riftHPmult = (tier: number): number => Math.pow(B.riftHpBase, tier - 1);
export const riftDMGmult = (tier: number): number => Math.pow(B.riftDmgBase, tier - 1);
export const riftGoldMult = (tier: number): number => Math.min(B.riftGoldCap, 1 + B.riftGoldPerTier * (tier - 1));
export const riftMaterialMult = (tier: number): number => Math.min(B.riftMatCap, 1 + B.riftMatPerTier * (tier - 1));
export const riftRareWeightMult = (tier: number): number => 1 + B.riftRarePerTier * Math.min(tier - 1, 100);
export const riftItemLevel = (tier: number): number => Math.min(100, 60 + Math.floor(0.6 * (tier - 1)));
export const riftModifierCount = (tier: number): number => (tier < 10 ? 1 : tier < 25 ? 2 : tier < 40 ? 3 : 4);

export interface RiftModifier {
  id: string;
  name: string;
  text: string;
  weight: number;
  compatibilityGroup: string;
  monsterHp?: number;
  monsterDmg?: number;
  rewardQuantity?: number;
  materialQuantity?: number;
  implemented: boolean;
}

/** spec 14.2 — only modifiers marked implemented can be drawn in the slice */
export const RIFT_MODIFIERS: RiftModifier[] = [
  { id: 'glass_horde', name: 'Gläserne Horden', text: 'Monster-LP −10%, Schaden +20%, Belohnungsmenge +8%', weight: 10, compatibilityGroup: 'hp', monsterHp: -0.10, monsterDmg: 0.20, rewardQuantity: 0.08, implemented: true },
  { id: 'undying_flesh', name: 'Unsterbliches Fleisch', text: 'Monster-LP +20%, Schaden −5%, Belohnungsmenge +8%', weight: 10, compatibilityGroup: 'hp', monsterHp: 0.20, monsterDmg: -0.05, rewardQuantity: 0.08, implemented: true },
  { id: 'iron_guard', name: 'Eiserne Garde', text: 'Monster-Rüstung +35%, Materialmenge +10%', weight: 10, compatibilityGroup: 'armor', materialQuantity: 0.10, implemented: false },
  { id: 'short_mercy', name: 'Kurze Gnade', text: 'Spielerschilde −20% Wirkung, Materialmenge +12%', weight: 10, compatibilityGroup: 'barrier', materialQuantity: 0.12, implemented: false },
  { id: 'hell_gate', name: 'Höllenpforte', text: '+1 Normalbegegnung, Materialmenge +15%', weight: 10, compatibilityGroup: 'length', materialQuantity: 0.15, implemented: true },
];

export function riftEncounters(tier: number, extraNormal = 0): EncounterDef[] {
  const normals = (tier >= 20 ? 4 : 3) + extraNormal;
  const elites = tier >= 40 ? 2 : 1;
  const out: EncounterDef[] = [];
  for (let i = 0; i < normals; i++) out.push({ type: 'normal', monsterId: 'abyss_spawn' });
  for (let i = 0; i < elites; i++) out.push({ type: 'elite', monsterId: 'abyss_knight' });
  out.push({ type: 'riftboss', monsterId: 'rift_maw' });
  return out;
}

export function rollRiftModifiers(seed: number, tier: number): RiftModifier[] {
  const rng = Rng.fromLabels(seed, 'riftmods');
  const chosen: RiftModifier[] = [];
  const n = riftModifierCount(tier);
  for (let i = 0; i < n; i++) {
    const pool = RIFT_MODIFIERS.filter((m) => m.implemented && !chosen.some((c) => c.compatibilityGroup === m.compatibilityGroup));
    const m = rng.pickWeighted(pool, (x) => x.weight);
    if (!m) break;
    chosen.push(m);
  }
  return chosen;
}

export function riftConfig(tier: number, mods: RiftModifier[]): RunConfig {
  const hp = mods.reduce((s, m) => s + (m.monsterHp ?? 0), 0);
  const dmg = mods.reduce((s, m) => s + (m.monsterDmg ?? 0), 0);
  const reward = Math.min(B.riftModifierRewardCap, mods.reduce((s, m) => s + (m.rewardQuantity ?? 0) + (m.materialQuantity ?? 0), 0));
  const extra = mods.some((m) => m.id === 'hell_gate') ? 1 : 0;
  return {
    id: `rift_t${tier}`, name: `Abgrundtor – Rift ${tier}`, encounters: riftEncounters(tier, extra),
    monsterLevel: 60, // D-011: Lv60 anchors as base, the rift multiplier does the rest
    baseWeights: { weapon: 45, armour: 35, jewellery: 15, relic: 5 }, baseFamilies: SLICE_BASE_FAMILIES,
    keepRewardsOnDefeat: false,
    hpMult: riftHPmult(tier) * (1 + hp), dpsMult: riftDMGmult(tier) * (1 + dmg),
    goldMult: riftGoldMult(tier), materialMult: riftMaterialMult(tier) * (1 + reward), rareWeightMult: riftRareWeightMult(tier),
  };
}

/** spec Appendix A.3.1 gate: minimum effective DPS to kill the rift boss before the hard timeout */
export function riftBossDpsGate(tier: number, bossHpL60 = B.monsterAnchors[3]!.bossHp, timeoutMs: number = B.maxBossCombatMs): { bossHp: number; minDps: number } {
  const bossHp = bossHpL60 * riftHPmult(tier);
  return { bossHp, minDps: bossHp / (timeoutMs / 1000) };
}

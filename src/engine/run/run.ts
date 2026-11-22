/**
 * Run resolution (spec 2 loop): sequential encounters, one combat each (new RNG sub-seed per fight),
 * rewards only after the final victory over an encounter. Pure function — used by commands and tooling.
 */
import { B } from '../../content/balance';
import { MONSTER_BY_ID } from '../../content/monsters/monsters';
import { Rng } from '../core/rng';
import { simulateCombat, type CombatantSpec, type CombatResult } from '../combat/simulate';
import { monsterCombatant } from '../combat/combatants';
import { encounterGold, encounterXp } from '../progression/levels';
import { emptyTelemetry, generateEncounterDrops, type LootTelemetry } from '../loot/generator';
import type { BaseGroup, EncounterDef, EncounterType, ItemInstance, MaterialId, Materials } from '../types';
import { MATERIAL_IDS } from '../types';

export interface RunConfig {
  id: string;
  name: string;
  encounters: EncounterDef[];
  monsterLevel: number;
  baseWeights: Record<BaseGroup, number>;
  baseFamilies: string[];
  keepRewardsOnDefeat: boolean;
  hpMult?: number;
  dpsMult?: number;
  goldMult?: number;
  materialMult?: number;
  rareWeightMult?: number;
}

export interface EncounterOutcome {
  index: number;
  monsterId: string;
  type: EncounterType;
  level: number;
  seed: number;
  outcome: CombatResult['outcome'];
  durationMs: number;
  eventHash: string;
  playerHpEnd: number;
  playerMaxHp: number;
  enemyMaxHp: number;
  metrics: CombatResult['metrics'];
  xp: number;
  gold: number;
  materials: Partial<Materials>;
  items: ItemInstance[];
}

export interface RunResult {
  victory: boolean;
  encounters: EncounterOutcome[];
  totals: { xp: number; gold: number; materials: Partial<Materials>; items: ItemInstance[] };
  loot: LootTelemetry;
}

export function emptyMaterials(): Materials {
  return Object.fromEntries(MATERIAL_IDS.map((m) => [m, 0])) as Materials;
}

function addMat(m: Partial<Materials>, id: MaterialId, n: number): void {
  if (n > 0) m[id] = (m[id] ?? 0) + n;
}

/** spec 8: material chances per completed encounter */
export function rollEncounterMaterials(rng: Rng, type: EncounterType, mult = 1): Partial<Materials> {
  const M = B.materials;
  const m: Partial<Materials> = {};
  const q = (n: number): number => Math.floor(n * mult + 1e-9);
  if (type === 'normal') addMat(m, 'FORGE_DUST', q(M.normalDust));
  if (type === 'elite') {
    if (rng.chance(M.eliteEssenceChance)) addMat(m, 'ESSENCE', 1);
    if (rng.chance(M.eliteSocketChance)) addMat(m, 'SOCKET_CORE', 1);
    if (rng.chance(M.eliteRuneFragChance)) addMat(m, 'RUNE_FRAGMENT', 1);
  }
  if (type === 'boss') {
    addMat(m, 'ESSENCE', M.bossEssence);
    addMat(m, 'ARCANE_SHARD', q(M.bossShards));
    if (rng.chance(M.bossChaosChance)) addMat(m, 'CHAOS_FRAGMENT', 1);
    if (rng.chance(M.bossSealChance)) addMat(m, 'SEAL_STONE', 1);
    if (rng.chance(M.bossSocketChance)) addMat(m, 'SOCKET_CORE', 1);
    if (rng.chance(M.bossRuneFragChance)) addMat(m, 'RUNE_FRAGMENT', 1);
  }
  if (type === 'riftboss') {
    addMat(m, 'ESSENCE', rng.int(M.riftbossEssence[0], M.riftbossEssence[1]));
    if (rng.chance(M.riftbossChaosChance)) addMat(m, 'CHAOS_FRAGMENT', 1);
    if (rng.chance(M.riftbossSealChance)) addMat(m, 'SEAL_STONE', 1);
    if (rng.chance(M.riftbossVoidAshChance)) addMat(m, 'VOID_ASH', 1);
    if (rng.chance(M.riftbossSocketChance)) addMat(m, 'SOCKET_CORE', 1);
    if (rng.chance(M.riftbossCorruptionChance)) addMat(m, 'CORRUPTION_CORE', 1);
    if (rng.chance(M.riftbossRuneFragChance)) addMat(m, 'RUNE_FRAGMENT', 1);
  }
  return m;
}

export function buildEnemy(cfg: RunConfig, enc: EncounterDef, index: number): CombatantSpec {
  const def = MONSTER_BY_ID[enc.monsterId];
  if (!def) throw new Error(`Unknown monster ${enc.monsterId}`);
  return monsterCombatant({ def, level: cfg.monsterLevel, encounterType: enc.type, hpMult: cfg.hpMult, dpsMult: cfg.dpsMult, index: 0 });
}

export function encounterSeed(runSeed: number, index: number): number {
  return Rng.fromLabels(runSeed, 'encounter', index).next() * 4294967296 >>> 0;
}

export function resolveRun(
  player: CombatantSpec,
  cfg: RunConfig,
  runSeed: number,
  opts: { magicFind: number; goldFind: number; playerLevel: number; record?: boolean; withLoot?: boolean },
): RunResult {
  const encounters: EncounterOutcome[] = [];
  const totals: RunResult['totals'] = { xp: 0, gold: 0, materials: {}, items: [] };
  const loot = emptyTelemetry();
  let victory = true;
  for (let i = 0; i < cfg.encounters.length; i++) {
    const enc = cfg.encounters[i]!;
    const seed = encounterSeed(runSeed, i);
    const enemy = buildEnemy(cfg, enc, i);
    const res = simulateCombat(player, [enemy], { seed, record: opts.record ?? false });
    const won = res.outcome === 'victory';
    const out: EncounterOutcome = {
      index: i, monsterId: enc.monsterId, type: enc.type, level: cfg.monsterLevel, seed, outcome: res.outcome,
      durationMs: res.durationMs, eventHash: res.eventHash, playerHpEnd: res.playerHpEnd, playerMaxHp: res.playerMaxHp,
      enemyMaxHp: enemy.derived.maxHP, metrics: res.metrics, xp: 0, gold: 0, materials: {}, items: [],
    };
    if (won) {
      out.xp = encounterXp(cfg.monsterLevel, enc.type, opts.playerLevel);
      out.gold = Math.round(encounterGold(cfg.monsterLevel, enc.type) * (cfg.goldMult ?? 1) * (1 + opts.goldFind));
      out.materials = rollEncounterMaterials(Rng.fromLabels(runSeed, 'mat', i), enc.type, cfg.materialMult ?? 1);
      if (opts.withLoot !== false) {
        out.items = generateEncounterDrops({
          seed: Rng.fromLabels(runSeed, 'loot', i).next() * 4294967296 >>> 0,
          encounterType: enc.type, monsterLevel: cfg.monsterLevel, baseWeights: cfg.baseWeights, baseFamilies: cfg.baseFamilies,
          magicFind: opts.magicFind, bossId: enc.type === 'boss' || enc.type === 'riftboss' ? enc.monsterId : undefined,
          source: `${cfg.name} Lv${cfg.monsterLevel} · ${enc.monsterId}`, rareWeightMult: cfg.rareWeightMult,
        }, loot).items;
      }
    }
    encounters.push(out);
    if (!won) {
      victory = false;
      break;
    }
  }
  const keep = victory || cfg.keepRewardsOnDefeat;
  if (keep) {
    for (const e of encounters) {
      totals.xp += e.xp;
      totals.gold += e.gold;
      for (const [k, v] of Object.entries(e.materials) as [MaterialId, number][]) addMat(totals.materials, k, v);
      totals.items.push(...e.items);
    }
  }
  return { victory, encounters, totals, loot };
}

export const CARRY_HP = B.carryHpBetweenEncounters;

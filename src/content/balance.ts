/**
 * DARKFORGE — central balance constants. balanceVersion 1 = spec start values.
 * Any change MUST be logged in BALANCE_CHANGELOG.md with old value, new value and evidence.
 */
import type { EncounterType, Rarity } from '../engine/types';

export const BALANCE_VERSION = 1;
export const CONTENT_VERSION = 1;
export const SAVE_SCHEMA_VERSION = 1;

export const B = {
  // ---------------------------------------------------- progression (spec 2)
  maxLevel: 100,
  xpNextBase: 85,
  xpNextExp: 1.45,
  freeAttributePointsPerLevel: 2,
  talentPointsPerLevel: 1,
  specPointLevels: [20, 45],
  respecPointBase: 100,
  respecPointExp: 1.2,
  respecFullMultiplier: 5,
  encounterXpBase: 25,
  encounterXpFactor: 10,
  encounterXpExp: 1.25,
  xpRankMult: { normal: 1, elite: 1.8, boss: 3.5, riftboss: 3.5 } as Record<EncounterType, number>,
  xpOverlevelThreshold: 9,       // player >= monster + 9
  xpOverlevelOffset: 8,
  xpOverlevelMin: 0.1,
  xpUnderlevelCap: 1.5,          // monsters > 5 levels above: max 1.5x
  xpUnderlevelGap: 5,

  // ---------------------------------------------------- base stats (spec 3.1)
  hpBase: 100, hpPerLevel: 12, hpPerVit: 14,
  manaBase: 60, manaPerLevel: 3, manaPerInt: 4,
  physIncPerStr: 0.0035, spellIncPerInt: 0.0035,
  attackSpeedPerDex: 0.0015, critPerDex: 0.00035, attributeFloor: 10,
  hpRegenPctPerSec: 0.005,
  manaRegenBase: 2, manaRegenPctPerSec: 0.015,

  caps: {
    critMin: 0.05, critMax: 0.55, critMultiMax: 3.0,
    resMin: -0.5, resMax: 0.75,
    blockMax: 0.40, evasionMax: 0.35, cdrMax: 0.40,
    lifeLeechMax: 0.08, leechPerSecPctMaxHp: 0.15,
    apsMin: 0.4, apsMax: 2.5,
    blockPowerMax: 0.75,
    barrierMaxPctHp: 0.60,
    curseResTotal: 0.25,
  },
  baseCritMulti: 1.5,
  baseBlockPower: 0.55,
  barrierDecayMs: 8000,

  // ---------------------------------------------------- mitigation (spec 3.3)
  armorConst: 450, armorPerAttackerLevel: 25, armorMaxReduction: 0.70,

  // ---------------------------------------------------- combat timing (spec 10)
  tickMs: 100,
  minActionMs: 400,
  minGcdMs: 350,
  /**
   * D-018: GCD measured from action START (min spacing between action starts).
   * 'actionEnd' = literal reading (GCD added after each action) — see docs/DECISIONS.md.
   */
  gcdFrom: 'actionStart' as 'actionStart' | 'actionEnd',
  maxCombatMs: 90_000,
  maxBossCombatMs: 150_000,
  /** D-081: each encounter starts with full HP/mana */
  carryHpBetweenEncounters: false,
  triggerMaxDepth: 3,
  triggerMaxPerAction: 8,
  triggerMaxPerEntityPerSec: 12,
  maxMinions: 4,

  // ---------------------------------------------------- statuses (spec 10.1)
  bleed: { pctOfHit: 0.22, durationMs: 5000, maxStacks: 5 },
  poison: { pctOfHit: 0.30, durationMs: 6000, maxStacks: 5 },
  burn: { pctOfHit: 0.36, durationMs: 4000, maxStacks: 3 },
  chill: { actionSpeed: -0.15, durationMs: 4000 },
  vulnerable: { damageTaken: 0.08, durationMs: 4000, maxStacks: 2 },
  curse: { resReduction: 0.12, durationMs: 5000 },

  // ---------------------------------------------------- skill levels (spec 11)
  skillLevelEffectPerLevel: 0.07,
  skillLevelCostPerLevel: 0.02,
  skillLevelReq: [1, 10, 25, 45, 65],
  activeSkillSlots: 4,

  // ---------------------------------------------------- weapons/armour tiers (spec 4)
  weaponTierMult: [1.0, 1.75, 3.1, 5.3, 8.7, 12.8],
  armourTierMult: [1, 1.8, 3.2, 5.5, 9.0, 13.5],
  baseTierMinLevel: [1, 12, 25, 40, 60, 80],
  /** D-083: within a base family, newest unlocked tier weight vs older tiers */
  baseNewestTierWeight: 3,
  baseOlderTierWeight: 1,

  // ---------------------------------------------------- affixes (spec 5/6)
  affixTierMinIlvl: { 5: 1, 4: 20, 3: 40, 2: 60, 1: 80 } as Record<number, number>,
  affixTierWeight: { 5: 30, 4: 30, 3: 23, 2: 12, 1: 5 } as Record<number, number>,
  affixTierFactor: { 5: 0.5, 4: 0.73, 3: 1.0, 2: 1.35, 1: 1.75 } as Record<number, number>,
  maxPrefixes: { normal: 0, magic: 1, rare: 3, unique: 0 } as Record<Rarity, number>,
  maxSuffixes: { normal: 0, magic: 1, rare: 3, unique: 0 } as Record<Rarity, number>,
  rareAffixCountWeights: { 3: 20, 4: 40, 5: 30, 6: 10 } as Record<number, number>,
  rareLowIlvlThreshold: 20,
  rareLowIlvlMaxAffixes: 4,
  /** D-082: magic drops roll 1 or 2 affixes with these weights */
  magicAffixCountWeights: { 1: 50, 2: 50 } as Record<number, number>,
  failedUniqueAffixCount: 6,

  // ---------------------------------------------------- loot (spec 7)
  dropCountWeights: {
    normal: [25, 55, 20, 0, 0],
    elite: [5, 45, 40, 10, 0],
    boss: [0, 0, 30, 50, 20],
    riftboss: [0, 0, 20, 50, 30],
  } as Record<EncounterType, number[]>,
  rarityWeights: {
    normal: { normal: 0.62, magic: 0.29, rare: 0.085, unique: 0.005 },
    elite: { normal: 0.47, magic: 0.36, rare: 0.16, unique: 0.01 },
    boss: { normal: 0.37, magic: 0.40, rare: 0.215, unique: 0.015 },
    riftboss: { normal: 0.31, magic: 0.43, rare: 0.24, unique: 0.02 },
  } as Record<EncounterType, Record<Rarity, number>>,
  mfConst: 200,
  mfUnique: 0.80, mfRare: 0.55, mfMagic: 0.20,
  ilvlOffset: { normal: [-1, 1], elite: [1, 1], boss: [2, 2], riftboss: [2, 2] } as Record<EncounterType, [number, number]>,

  // ---------------------------------------------------- materials (spec 8) — chances per completed encounter
  materials: {
    normalDust: 2,
    eliteEssenceChance: 0.40,
    bossEssence: 1,
    riftbossEssence: [1, 2] as [number, number],
    bossShards: 3,
    bossChaosChance: 0.18, riftbossChaosChance: 0.35,
    bossSealChance: 0.10, riftbossSealChance: 0.20,
    riftbossVoidAshChance: 0.12,
    eliteSocketChance: 0.04, bossSocketChance: 0.12, riftbossSocketChance: 0.20,
    riftbossCorruptionChance: 0.05,
    eliteRuneFragChance: 0.20, bossRuneFragChance: 0.60, riftbossRuneFragChance: 1.0,
  },
  salvage: {
    normal: { FORGE_DUST: [1, 1] },
    magic: { FORGE_DUST: [2, 3], ARCANE_SHARD: [1, 1] },
    rare: { ARCANE_SHARD: [2, 3] },
    unique: { ARCANE_SHARD: [2, 3] },
  } as Record<Rarity, Partial<Record<string, [number, number]>>>,

  // ---------------------------------------------------- economy (spec 17)
  goldBase: 8, goldFactor: 3, goldExp: 1.2,
  goldRankMult: { normal: 1, elite: 2, boss: 4, riftboss: 4 } as Record<EncounterType, number>,
  inventorySize: 60,
  stashTabSize: 48,
  stashTabCosts: [0, 1000, 5000, 20000, 60000],

  // ---------------------------------------------------- monsters (spec 13.1a)
  monsterAnchors: [
    { level: 1, hp: 120, bossHp: 800, dps: 4, bossDps: 5 },
    { level: 15, hp: 650, bossHp: 4800, dps: 13, bossDps: 18 },
    { level: 35, hp: 4300, bossHp: 38000, dps: 28, bossDps: 50 },
    { level: 60, hp: 18000, bossHp: 110000, dps: 48, bossDps: 90 },
    { level: 75, hp: 50000, bossHp: 240000, dps: 70, bossDps: 125 },
    { level: 90, hp: 140000, bossHp: 500000, dps: 105, bossDps: 190 },
    { level: 100, hp: 220000, bossHp: 750000, dps: 135, bossDps: 235 },
  ],
  eliteHpFactor: 2.6,
  eliteDpsFactor: 1.45,
  archetype: {
    brute: { hp: 1.25, dps: 0.85 },
    assassin: { hp: 0.80, dps: 1.15 },
    sentinel: { hp: 1.10, dps: 0.90 },
    // D-059: not given in spec, chosen as neutral-ish starting values
    caster: { hp: 0.90, dps: 1.10 },
    swarm: { hp: 0.85, dps: 1.00 },
    corruptor: { hp: 0.95, dps: 1.00 },
  },

  // ---------------------------------------------------- rifts (spec 14)
  riftUnlockLevel: 60,
  riftHpBase: 1.10, riftDmgBase: 1.045,
  riftGoldPerTier: 0.035, riftGoldCap: 3.0,
  riftMatPerTier: 0.025, riftMatCap: 2.5,
  riftRarePerTier: 0.004,
  riftModifierRewardCap: 0.60,
} as const;

export type Balance = typeof B;

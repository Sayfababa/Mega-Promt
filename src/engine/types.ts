/**
 * Shared engine/content types. Pure data — no React/DOM imports allowed in src/engine.
 */

// ---------------------------------------------------------------- damage & tags
export type DamageType = 'physical' | 'fire' | 'cold' | 'lightning' | 'shadow';
export const DAMAGE_TYPES: readonly DamageType[] = ['physical', 'fire', 'cold', 'lightning', 'shadow'];
export const ELEMENTS: readonly DamageType[] = ['fire', 'cold', 'lightning', 'shadow'];

export type Tag =
  | 'ATTACK' | 'SPELL' | 'MELEE'
  | 'PHYSICAL' | 'FIRE' | 'COLD' | 'LIGHTNING' | 'SHADOW' | 'ELEMENTAL'
  | 'DOT' | 'BLEED' | 'POISON' | 'BURN'
  | 'MINION' | 'FINISHER' | 'EXECUTE' | 'BARRIER' | 'HEAL' | 'BUFF' | 'DEBUFF'
  | 'HOLY' | 'COUNTER' | 'TRIGGERED' | 'REFLECT';

/** Conditions evaluated at hit-time against attacker/target state */
export type Condition =
  | 'targetBleeding'
  | 'targetPoisoned'
  | 'targetIsBoss'
  | 'targetHasBarrier'
  | 'targetHpBelow25'
  | 'selfHpAbove70'
  | 'selfHpBelow50'
  | 'withShield';

export type ScalarStat =
  | 'str' | 'dex' | 'int' | 'vit'
  | 'incStr' | 'incDex' | 'incInt' | 'incVit'
  | 'curseDuration'
  | 'flatHP' | 'incMaxHP' | 'moreMaxHP'
  | 'flatMana' | 'incMana'
  | 'flatArmor' | 'incArmor'
  | 'critChance'          // global +pp (fraction, 0.03 = 3pp)
  | 'critMulti'           // bonus to crit multiplier (fraction, 0.15 = +15pp)
  | 'attackSpeed'         // global increased attack speed (fraction)
  | 'castSpeed'
  | 'resFire' | 'resCold' | 'resLightning' | 'resShadow' | 'resAll'
  | 'penFire' | 'penCold' | 'penLightning' | 'penShadow'
  | 'blockChance' | 'blockPower'
  | 'evasion'
  | 'manaRegen'           // increased mana regen (fraction)
  | 'hpRegenFlat'         // flat HP per second
  | 'lifeLeech'
  | 'cdr'
  | 'magicFind' | 'goldFind'
  | 'statusDuration' | 'bleedDuration' | 'poisonDuration'
  | 'bleedDurationFlatMs' // additive milliseconds (Scharlachkette: -1000)
  | 'bleedChance'         // added chance to apply bleed on attack hits
  | 'bleedChanceOnCrit'   // added chance to apply bleed on crit (Blutgericht)
  | 'poisonChance'
  | 'healPower'
  | 'flatBarrier' | 'barrierPower'
  | 'cursePower'
  | 'damageTakenInc'      // increased damage taken (additive)
  | 'directDamageTakenInc'
  | 'armorPen'            // fraction of target armor ignored for weapon hits
  | 'armorReduction'      // debuff on self: reduces own armor (fraction)
  | 'damageDealtReduction'; // debuff: less damage dealt (fraction)

export type Modifier =
  | { type: 'stat'; stat: ScalarStat; value: number; cond?: Condition }
  /** additive increased damage; applies when ALL tags are contained in the hit tags */
  | { type: 'inc'; tags: Tag[]; value: number; cond?: Condition }
  /** multiplicative "more" damage; one entry per group, groups multiply */
  | { type: 'more'; group: string; tags: Tag[]; value: number; cond?: Condition };

/** Weapon-/armour-local stats, applied before character aggregation (spec 3.2) */
export type LocalStat =
  | 'physInc' | 'physFlatMin' | 'physFlatMax'
  | 'fireFlatMin' | 'fireFlatMax' | 'coldFlatMin' | 'coldFlatMax' | 'lightningFlatMin' | 'lightningFlatMax'
  | 'attackSpeed' | 'crit' | 'armorInc';

// ---------------------------------------------------------------- items
export type EquipSlot =
  | 'mainhand' | 'offhand' | 'helm' | 'chest' | 'gloves' | 'boots' | 'belt' | 'amulet' | 'ringA' | 'ringB' | 'relic';
export const EQUIP_SLOTS: readonly EquipSlot[] = [
  'mainhand', 'offhand', 'helm', 'chest', 'gloves', 'boots', 'belt', 'amulet', 'ringA', 'ringB', 'relic',
];

export type ItemKind =
  | 'weapon1h' | 'weapon2h' | 'offhand' | 'helm' | 'chest' | 'gloves' | 'boots' | 'belt' | 'amulet' | 'ring' | 'relic';

/** affix slot categories from spec section 6 */
export type AffixCategory = 'M' | 'C' | 'A' | 'J' | 'B' | 'O' | 'R';
export type BaseGroup = 'weapon' | 'armour' | 'jewellery' | 'relic';

export interface WeaponStats {
  min: number;
  max: number;
  aps: number;
  crit: number; // fraction
  hands: 1 | 2;
  casterEligible: boolean;
}

export interface ItemBase {
  id: string;
  name: string;
  familyId: string;
  kind: ItemKind;
  group: BaseGroup;
  categories: AffixCategory[];
  tier: number;          // base tier 1..6
  minLevel: number;      // minBaseLevel
  weapon?: WeaponStats;
  armour?: number;       // base armour (already tier scaled)
  material?: 'plate' | 'leather' | 'cloth';
  offhandKind?: 'shield' | 'focus' | 'totem';
  implicits: Modifier[];
  implicitText: string;
  icon: string;          // asset key (see docs/ASSETS.md)
}

export type Rarity = 'normal' | 'magic' | 'rare' | 'unique';
export type AffixSide = 'prefix' | 'suffix';

export interface RollDef {
  /** T3 reference interval */
  min: number;
  max: number;
  unit: 'int' | 'dec1';
}

/** how a rolled value maps to a modifier: value * scale */
export type ModTemplate =
  | { type: 'stat'; stat: ScalarStat; roll: number; scale: number }
  | { type: 'inc'; tags: Tag[]; roll: number; scale: number }
  | { type: 'local'; stat: LocalStat; roll: number; scale: number };

export interface AffixFamily {
  id: string;            // stable ID e.g. "p01"
  groupId: string;       // exclusivity group (one mod per group per item)
  side: AffixSide;
  name: string;
  text: string;          // display template, {0},{1} = rolled values
  categories: AffixCategory[];
  weight: number;
  rolls: RollDef[];
  mods: ModTemplate[];
  tags: string[];        // semantic tags e.g. LOCAL_WEAPON_DAMAGE; essence matching
  essenceTags: EssenceType[];
  minItemLevel: number;
  /** if true the family ignores tiers (e.g. skill level) */
  noTiers?: boolean;
  /** families only valid on specific item kinds (whitelist refinement) */
  kinds?: ItemKind[];
}

export type EssenceType = 'power' | 'life' | 'spark' | 'ash' | 'poison' | 'warding';

export interface AffixInstance {
  familyId: string;
  tier: number;          // 1..5 (0 = special)
  values: number[];
  sealed?: boolean;
}

export interface HistoryEntry {
  action: string;
  detail?: string;
  seed?: number;
  prevHash?: string;
  newHash?: string;
}

export interface ItemInstance {
  uid: string;
  baseId: string;
  rarity: Rarity;
  itemLevel: number;
  prefixes: AffixInstance[];
  suffixes: AffixInstance[];
  uniqueId?: string;
  uniqueRolls?: number[];
  sockets: number;
  runes: string[];
  corrupted: boolean;
  fractured: boolean;
  locked: boolean;
  favorite: boolean;
  source: string;
  history: HistoryEntry[];
}

// ---------------------------------------------------------------- uniques & triggers
export type TriggerEvent = 'onCrit' | 'onBlock' | 'onHitTaken' | 'onAttackHit' | 'onBarrierBreak' | 'onKill';

export type TriggerEffect =
  | { kind: 'applyBleed' }
  | { kind: 'applyPoison' }
  | { kind: 'gainBarrierPctMaxHp'; value: number }
  /** reflect a fraction of the incoming (pre-mitigation) blockable direct damage as physical hit */
  | { kind: 'reflectPhysical'; fraction: number; capPctMaxHpPerSec: number }
  | { kind: 'counterWeaponHit'; coefficient: number }
  | { kind: 'nextAttackInc'; value: number };

export interface TriggerDef {
  effectId: string;
  event: TriggerEvent;
  chance: number;
  icdMs: number;
  effect: TriggerEffect;
  /** hit must carry all of these tags (for onCrit/onAttackHit) */
  requireTags?: Tag[];
}

/** special non-modifier rules toggled by uniques/passives */
export interface SpecialRules {
  /** Scharlachkette: finisher +X MORE when target has >= N bleed stacks */
  finisherMoreAtBleedStacks?: { stacks: number; more: number };
}

export interface UniqueDef {
  id: string;
  name: string;
  baseId: string;
  minItemLevel: number;
  dropSource: string;          // 'world' or boss id
  uniqueRolls: { min: number; max: number; unit: 'int' | 'dec1'; label: string }[];
  /** modifiers; value may reference uniqueRolls via rollIndex (value * roll) */
  mods: (Modifier & { rollIndex?: number })[];
  triggers: TriggerDef[];
  special?: SpecialRules;
  tags: string[];
  tradeoff: string;
  text: string[];
  internalCooldownMs: number;
  icon: string;
}

// ---------------------------------------------------------------- skills
export type SkillKind = 'attack' | 'spell' | 'buff';
export type PriorityCondition =
  | 'always'
  | 'selfHpBelow35'
  | 'selfHpBelow40'
  | 'barrierBelow15'
  | 'buffMissing'
  | 'targetHpBelow25'
  | 'targetBleedStacks3';

export interface SkillDef {
  id: string;
  classId: string;
  name: string;
  kind: SkillKind;
  tags: Tag[];
  weaponCoefficient: number;     // attack skills
  /** per bleed stack on the target, extra weapon coefficient (Bluternte) */
  coefficientPerTargetBleed?: number;
  consumesTargetBleeds?: boolean;
  bleedChance?: number;          // base chance to apply a bleed stack on hit
  castTimeMs: number;            // buffs/spells; attacks use APS
  cooldownMs: number;
  gcdMs: number;
  manaCost: number;
  /** self buff/debuff applied */
  selfBuff?: { statusId: string; durationMs: number; mods: Modifier[] };
  targetDebuff?: { statusId: string; durationMs: number; armorReduction?: number };
  barrierPctMaxHp?: number;
  healPctMaxHp?: number;
  requiresSelfHpBelow?: number;
  defaultCondition: PriorityCondition;
  description: string;
  icon: string;
}

export interface PriorityRule {
  skillId: string;
  condition: PriorityCondition;
}

// ---------------------------------------------------------------- passives
export interface PassiveNode {
  id: string;
  name: string;
  size: 'root' | 'small' | 'medium' | 'key';
  mods: Modifier[];
  edges: string[];
  text: string;
  pos: { x: number; y: number };
}

// ---------------------------------------------------------------- monsters
export type MonsterArchetype = 'brute' | 'assassin' | 'caster' | 'sentinel' | 'swarm' | 'corruptor';
export type MonsterRank = 'normal' | 'elite' | 'boss';

export interface MonsterAbility {
  id: string;
  name: string;
  everyMs: number;
  /** multiple of a basic hit */
  hitMultiple: number;
  damageType: DamageType;
  appliesBleed?: boolean;
  appliesPoison?: boolean;
  description: string;
}

export interface MonsterDef {
  id: string;
  name: string;
  archetype: MonsterArchetype;
  rank: MonsterRank;
  damageType: DamageType;
  attackSpeed: number;
  armorPerLevel: number;
  resist: Partial<Record<DamageType, number>>;
  critChance: number;
  blockChance?: number;
  evasion?: number;
  abilities: MonsterAbility[];
  tags: string[];
  icon: string;
  description: string;
}

// ---------------------------------------------------------------- dungeons
export type EncounterType = 'normal' | 'elite' | 'boss' | 'riftboss';

export interface EncounterDef {
  type: EncounterType;
  monsterId: string;
}

export interface DungeonDef {
  id: string;
  name: string;
  minLevel: number;
  maxLevel: number;
  encounters: EncounterDef[];
  baseWeights: Record<BaseGroup, number>;
  keepRewardsOnDefeat: boolean;
  description: string;
  icon: string;
}

export type MaterialId =
  | 'FORGE_DUST' | 'ARCANE_SHARD' | 'ESSENCE' | 'CHAOS_FRAGMENT' | 'SEAL_STONE' | 'VOID_ASH'
  | 'SOCKET_CORE' | 'CORRUPTION_CORE' | 'RUNE_FRAGMENT' | 'BOSS_SIGIL';
export const MATERIAL_IDS: readonly MaterialId[] = [
  'FORGE_DUST', 'ARCANE_SHARD', 'ESSENCE', 'CHAOS_FRAGMENT', 'SEAL_STONE', 'VOID_ASH',
  'SOCKET_CORE', 'CORRUPTION_CORE', 'RUNE_FRAGMENT', 'BOSS_SIGIL',
];

export type Materials = Record<MaterialId, number>;

export interface ClassDef {
  id: string;
  name: string;
  start: { str: number; dex: number; int: number; vit: number };
  perLevel: { str: number; dex: number; int: number; vit: number };
  skills: string[];
  passiveTree: string;
  starterItems: string[]; // base ids
  playable: boolean;
  icon: string;
}

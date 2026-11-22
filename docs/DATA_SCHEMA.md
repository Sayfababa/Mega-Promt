# DATA_SCHEMA — Datenmodelle (TypeScript-artig)

Abgeleitet aus Spec §1–§17. Implementierung: Zod-Schemas in `src/engine/core/validators.ts` / `src/persistence/schema.ts`, Typen per `z.infer`. Konventionen:

- IDs sind stabile Strings (`snake_case` für Content-Definitionen, z. B. `weapon_dagger`, `affix_p01`; UUID/`crypto`-freie deterministische IDs für Instanzen, z. B. `itm_<runSeed>_<seq>`).
- Wahrscheinlichkeiten `∈ [0,1]`, Gewichte `≥ 0`, keine `NaN`/`Infinity` (Zod `.finite()`).
- Prozentwerte intern als Bruch (`0.12` = 12%); „pp“-Werte ebenfalls als Bruch (`0.05` = 5 Prozentpunkte).
- Zeit in ganzzahligen Millisekunden (D-003).
- `LocalizedText = { key: string }` — Texte in `app/i18n/de.json`.

## 1. Gemeinsame Typen

```ts
type Id = string;
type Ms = number;                 // ganzzahlig
type Fraction = number;           // 0.12 = 12 %

type DamageType = 'physical' | 'fire' | 'cold' | 'lightning' | 'shadow';
// HOLY ist ein Tag, keine Schadensart (D-004)

type Tag =
  | 'ATTACK' | 'SPELL' | 'MELEE' | 'RANGED' | 'DOT' | 'HIT'
  | 'PHYSICAL' | 'FIRE' | 'COLD' | 'LIGHTNING' | 'SHADOW' | 'ELEMENTAL' | 'HOLY'
  | 'BLEED' | 'POISON' | 'BURN' | 'SLOW' | 'CURSE' | 'VULNERABLE' | 'STUN'
  | 'BARRIER' | 'HEAL' | 'BUFF' | 'EXECUTE' | 'SUMMON' | 'MINION' | 'COUNTER' | 'RUNE'
  | 'BOSS' | 'ELITE';

type SlotId = 'mainHand' | 'offHand' | 'helm' | 'chest' | 'gloves' | 'boots'
            | 'belt' | 'amulet' | 'ringA' | 'ringB' | 'relic';

type AffixSlotClass = 'M' | 'C' | 'A' | 'J' | 'B' | 'O' | 'R' | 'X';   // §6
type Rarity = 'normal' | 'magic' | 'rare' | 'unique';
type AffixTier = 0 | 1 | 2 | 3 | 4 | 5;                                // T0 nur Spezialquelle
type AffixSide = 'prefix' | 'suffix';

/** Ein Stat-Modifikator — einheitliche Sprache für Affixe, Implizite, Runen, Talente, Buffs, Uniques. */
interface StatMod {
  stat: StatKey;                 // z. B. 'increased', 'flat_hp', 'crit_chance', 'res_fire', 'block_chance'
  kind: 'flat' | 'increased' | 'more' | 'override';
  value: number;
  valueMax?: number;             // für Flat-Schadenspaare (Max-Teil)
  tags?: Tag[];                  // Anwendbarkeit (increased nur bei passendem Tag)
  scope: 'local' | 'global';     // local nur auf Item selbst (§3.2)
  stackingGroup?: Id;            // Pflicht bei kind === 'more'
  condition?: Condition;         // z. B. HP < 50 %, Ziel blutet, Schild ausgerüstet
}

type StatKey =
  | 'flat_phys_damage' | 'flat_fire_damage' | 'flat_cold_damage' | 'flat_lightning_damage'
  | 'increased_damage' | 'more_damage'
  | 'attack_speed' | 'cast_speed' | 'crit_chance' | 'crit_multiplier'
  | 'flat_hp' | 'increased_max_hp' | 'flat_mana' | 'increased_mana'
  | 'flat_barrier' | 'barrier_effect' | 'hp_regen_flat' | 'mana_regen'
  | 'armor_flat' | 'armor_increased' | 'armor_penetration'
  | 'res_fire' | 'res_cold' | 'res_lightning' | 'res_shadow' | 'res_all' | 'penetration'
  | 'block_chance' | 'block_strength' | 'evasion'
  | 'life_leech' | 'cdr' | 'magic_find' | 'gold_find'
  | 'status_duration' | 'dot_effect' | 'heal_power' | 'curse_power' | 'minion_damage'
  | 'skill_level' | 'attr_str' | 'attr_dex' | 'attr_int' | 'attr_vit' | 'attr_percent'
  | 'damage_taken_increased' | 'action_speed' | 'effect_strength';

interface Condition {
  kind: 'hpBelow' | 'hpAbove' | 'targetHpBelow' | 'targetHasStatus' | 'targetIsBoss'
      | 'hasShieldEquipped' | 'targetHasBarrier' | 'runeSocketed';
  value?: number; statusId?: Id;
}
```

## 2. Item-Basen

```ts
interface ItemBase {
  id: Id;                          // 'weapon_dagger_t1'
  family: Id;                      // 'dagger' — Familie über Tiers hinweg
  name: LocalizedText;
  slotType: 'weapon' | 'offhand' | 'helm' | 'chest' | 'gloves' | 'boots' | 'belt' | 'amulet' | 'ring' | 'relic';
  affixClasses: AffixSlotClass[];  // z. B. ['M'] oder ['C'] oder ['M','C'] (Runenklinge, D-038)
  baseTier: 1 | 2 | 3 | 4 | 5 | 6;
  minBaseLevel: number;            // T1 1, T2 12, T3 25, T4 40, T5 60, T6 80
  handedness?: 1 | 2;              // Waffen
  weapon?: {
    minDamage: number; maxDamage: number;   // bereits tier-skaliert (roundHalfUp)
    attacksPerSecond: number;
    baseCrit: Fraction;
    martial: boolean;              // für Sockel-Cap und ±15 %-Regel
    casterEligible: boolean;
  };
  armour?: {
    material?: 'plate' | 'leather' | 'cloth';
    baseArmor: number;             // T1-Wert × Material-Anteil × Rüstungs-Tier-Multiplikator
  };
  offhandKind?: 'shield' | 'focus' | 'totem';
  implicits: StatMod[];            // feste implizite Boni
  maxSockets: 0 | 1 | 2;           // mart. 2H 2, sonst 1 (Unique max 1)
  tags: Tag[];
  icon: Id;
}
```

## 3. Affixe

```ts
interface AffixFamily {
  id: Id;                          // 'p01'
  groupId: Id;                     // Exklusivität: max 1 Mod pro groupId und Item (§5)
  side: AffixSide;
  name: LocalizedText;
  allowedClasses: AffixSlotClass[];
  spawnWeight: number;             // relatives Familiengewicht
  tags: Tag[];                     // 'LOCAL_WEAPON_DAMAGE', 'GLOBAL_FIRE' ... als Semantik-Tags
  essenceTags?: EssenceType[];     // für Präzise Essenz
  minItemLevel?: number;           // s26: 60
  tierless?: boolean;              // s26
  tiers: AffixTierDef[];           // generiert aus T3-Referenz × Faktor oder explizit
  valueFormat: 'int' | 'percent1'; // Rundung: ganzzahlig bzw. 0,1 %
}

interface AffixTierDef {
  tier: AffixTier;
  minItemLevel: number;            // T5 1, T4 20, T3 40, T2 60, T1 80, T0 94
  weight: number;                  // 30/30/23/12/5, T0 0.5 nur im Spezialpool
  ranges: Array<{ stat: StatKey; min: number; max: number; part?: 'min' | 'max' }>;
  specialSourceOnly?: boolean;     // T0
  requiredLevelBonus?: number;     // D-057
}

interface AffixInstance {
  familyId: Id;
  groupId: Id;
  side: AffixSide;
  tier: AffixTier;
  rolls: number[];                 // gewürfelte Werte (p02: [min, max])
  sealed: boolean;                 // Affix-Schutz für genau 1 Neuschmieden
  origin: 'drop' | 'craft' | 'essence' | 'corruption';
}

type EssenceType = 'kraft' | 'leben' | 'funke' | 'asche' | 'gift' | 'abschirmung';
```

## 4. Item-Instanz

```ts
interface Item {
  id: Id;                          // stabil, normalisiert gespeichert (§17)
  baseId: Id;
  rarity: Rarity;
  itemLevel: number;               // 1–100
  requiredLevel: number;
  implicits: StatMod[];            // Kopie der Basis-Implizite (+ gerollte Wahl, z. B. Amulett-Attribut)
  prefixes: AffixInstance[];       // ≤ 1 (magic) / ≤ 3 (rare)
  suffixes: AffixInstance[];
  unique?: { uniqueId: Id; rolls: number[] };
  sockets: Array<{ runeId: Id | null }>;
  corrupted: boolean;
  fractured: boolean;
  corruptionEnchant?: StatMod;
  corruptionPenalty?: StatMod;
  locked: boolean;                 // nicht verwertbar/überschreibbar
  favorite: boolean;
  source: { kind: 'drop' | 'craft' | 'reward' | 'sigilExchange'; dungeonId?: Id; encounterIdx?: number; runId?: Id };
  history: CraftHistoryEntry[];    // inkl. 'failedUniqueRoll'
  hash: string;                    // Hash des kanonischen Item-Zustands
}

interface CraftHistoryEntry {
  seq: number;
  action: CraftRecipeId | 'failedUniqueRoll' | 'generated';
  previousItemHash: string;
  newItemHash: string;
  materials: Partial<Record<MaterialId, number>>;
  seed: number;
  result: 'success' | 'rejected';
  t: number;                       // logischer Zeitstempel (Command-Seq), nicht Wallclock-abhängig für Engine
}

interface UniqueDef {
  id: Id; name: LocalizedText;
  baseId: Id; minItemLevel: number;
  dropSource: { kind: 'world' } | { kind: 'boss'; bossId: Id } | { kind: 'sigilExchange'; bossId: Id };
  fixedMods: StatMod[];
  uniqueRolls: Array<{ stat: StatKey; min: number; max: number }>;
  effects: EffectHandler[];        // deklarative Event-Handler, keine Text-Simulation
  tags: Tag[];
  tradeoff: StatMod[];
  internalCooldownMs?: Ms;
}
```

## 5. Effekte / Trigger (deklarativ)

```ts
interface EffectHandler {
  effectId: Id;
  on: 'hit' | 'crit' | 'kill' | 'block' | 'evade' | 'barrierBreak' | 'dotTick'
    | 'statusApplied' | 'damageTaken' | 'minionDeath' | 'actionBegin' | 'combatStart';
  filter?: { tags?: Tag[]; condition?: Condition; everyNth?: { n: number; windowMs: Ms } };
  chance?: Fraction;
  internalCooldownMs?: Ms;
  allowTriggeredSources?: boolean; // default false
  action:
    | { kind: 'dealDamage'; damageType: DamageType; fromTriggeringFraction?: number; spellBase?: { flat: number; intCoef: number }; tags: Tag[] }
    | { kind: 'applyStatus'; statusId: Id; stacks?: number }
    | { kind: 'gainBarrier'; fractionMaxHp: number }
    | { kind: 'heal'; fractionMaxHp?: number; fractionOfDamage?: number }
    | { kind: 'gainResource'; mana: number }
    | { kind: 'castSkill'; skillId: Id; damageFraction: number }
    | { kind: 'buff'; mods: StatMod[]; durationMs: Ms; maxStacks?: number };
}
```

## 6. Charakter

```ts
type ClassId = 'guardian' | 'arcanist' | 'shadowrunner' | 'necromancer' | 'runesmith' | 'inquisitor';

interface Character {
  id: Id;
  name: string;
  classId: ClassId;
  level: number;                   // 1–100
  xp: number;                      // Fortschritt im aktuellen Level
  baseAttributes: Attributes;      // Klassenstart + Auto-Boni
  allocatedAttributes: Attributes; // freie Punkte
  unspentAttributePoints: number;
  talents: { allocated: Id[]; unspentPoints: number; specializationPoints: number; freeResetUsed: boolean };
  skills: {
    active: Array<{ skillId: Id; level: number; supports: Id[] } | null>;   // 4 Slots
    passive: Array<Id | null>;     // 2 Slots
    basicAttackId: Id;
    apl: AplRule[];
  };
  equipment: Partial<Record<SlotId, Id>>;   // Item-IDs; eine Instanz nie in 2 Slots
  progression: {
    clearedDungeons: Record<Id, number>;
    highestClearedRiftTier: number;
    firstDungeonGuaranteeGiven: boolean;
    firstBossAfter10GuaranteeGiven: boolean;
    bossSigils: Record<Id, number>;           // bossgebunden
    discoveredUniques: Id[];
    constellation: { allocated: Id[]; points: number };
  };
}

interface Attributes { str: number; dex: number; int: number; vit: number }

interface AplRule {
  id: Id;
  skillId: Id | 'basicAttack' | 'wait';
  condition?: { kind: 'selfHpBelow' | 'selfBarrierBelow' | 'buffMissing' | 'targetHpBelow' | 'manaAbove' | 'always'; value?: number };
  enabled: boolean;
}

interface ClassDef {
  id: ClassId; name: LocalizedText;
  startAttributes: Attributes;
  perLevel: Partial<Attributes>;   // Wächter { str: 1, vit: 1 }
  skillIds: Id[]; talentTreeId: Id; phase: 1 | 2 | 3 | 4 | 5;
}
```

## 7. Skill, Talent, Support

```ts
interface Skill {
  id: Id; classId: ClassId | 'shared'; name: LocalizedText;
  tags: Tag[];
  kind: 'attack' | 'spell' | 'buff' | 'barrier' | 'heal' | 'summon' | 'hybrid';
  castTimeMs?: Ms;                 // Spells/Buffs (D-020); Attacks nutzen 1000/APS
  cooldownMs: Ms;
  globalCooldownMs?: Ms;           // default 350
  resourceCost: number;            // Mana
  damage?: Array<{
    damageType: DamageType;
    weaponCoefficient?: number;    // Attack: × mean(weaponMin, weaponMax)
    flatBase?: number; intCoefficient?: number;   // Spell
    perStatusStack?: { statusId: Id; coefficient: number; consume: boolean };   // Bluternte
    hits?: number;                 // Schnellstich 2
    tags: Tag[];
    evadable: boolean; blockable: boolean;
  }>;
  applies?: Array<{ statusId: Id; chance: Fraction; stacks?: number }>;
  selfEffects?: Array<{ mods: StatMod[]; durationMs: Ms }>;
  targetEffects?: Array<{ mods: StatMod[]; durationMs: Ms }>;
  barrier?: { fractionMaxHp: number };
  heal?: { fractionMaxHp: number; requiresHpBelow?: Fraction };
  usableIf?: Condition;
  priorityRules: AplRule[];        // Standard-APL-Einordnung
  upgradeRules: { perLevelIncreased: 0.07; perLevelCost: 0.02; levelReq: [1, 10, 25, 45, 65] };
  description: LocalizedText;
}

interface TalentNode {
  id: Id; treeId: Id;
  size: 'small' | 'medium' | 'key' | 'start';
  mods: StatMod[];                 // Key-Nodes: Vorteil + Nachteil
  effects?: EffectHandler[];
  edges: Id[];                     // ungerichtete Verbindungen
  maxRank?: number;                // D-048
}

interface SupportDef {             // „Support-Siegel“ / Skill-Modifikator (D-031)
  id: Id; supportGroup: Id;
  eligibleTags: Tag[];
  mods: StatMod[]; costMods: StatMod[];
  effects?: EffectHandler[];
  levelReq: 20;
}
```

## 8. Status

```ts
interface Status {
  id: 'bleed' | 'poison' | 'burn' | 'slow' | 'vulnerable' | 'curse' | 'stun' | Id;
  kind: 'dot' | 'debuff' | 'buff' | 'control';
  damageType?: DamageType;         // DoT
  snapshotFraction?: number;       // 0.22 / 0.30 / 0.36 des Roh-Trefferschadens
  durationMs: Ms;                  // 5000 / 6000 / 4000 / 4000 / 4000 / 5000
  maxStacks: number;               // 5 / 5 / 3 / 1 / 2 / —
  stackRule: 'independent' | 'refresh' | 'replaceOldest';
  mods?: StatMod[];                // Slow: action_speed −0.15; Verwundbar: damage_taken +0.08; Fluch: res −0.12
  globalCap?: { stat: StatKey; min: number };   // Fluch gesamt −0.25
  bypassesBarrier?: boolean;
  tags: Tag[];
}

interface StatusInstance {         // Laufzeit, nicht persistiert
  statusId: Id; sourceId: Id; targetId: Id;
  appliedSeq: number; appliedAt: Ms; expiresAt: Ms;
  snapshot?: { total: number; perTick: number; ticksLeft: number; sourceLevel: number };
}
```

## 9. Monster, Encounter, Dungeon

```ts
type MonsterProfile = 'brute' | 'assassin' | 'caster' | 'sentinel' | 'swarm' | 'corruptor';

interface Monster {
  id: Id; name: LocalizedText;
  rank: 'normal' | 'elite' | 'boss' | 'riftBoss' | 'pinnacle';
  profile: MonsterProfile;
  hpFactor: number; dpsFactor: number;   // Brute 1.25/0.85 …
  armor: number | { perLevel: number };  // D-059
  resist: Partial<Record<DamageType, Fraction>>;
  attack: { damageType: DamageType; attacksPerSecond: number; critChance?: Fraction; evadable: boolean; blockable: boolean };
  initiative: number;                    // D-059
  skills: Id[];
  aiPriority: AplRule[];
  phases?: Array<{ hpBelow: Fraction; mods: StatMod[]; effects?: EffectHandler[] }>;
  mechanics?: EffectHandler[];           // Bossmechaniken (§13.2)
  lootProfileId: Id;
  tags: Tag[];
  icon: Id;
}

interface MonsterInstance {               // berechnet, nicht als Content gespeichert
  monsterId: Id; monsterLevel: number;
  maxHp: number;                          // Anker-Interpolation × Rang × hpFactor (× Rift)
  rawDps: number;                         // Anker × Rang × dpsFactor (× Rift)
  hitDamage: number;                      // rawDps / attacksPerSecond (D-074)
}

interface Encounter {
  id: Id;
  kind: 'normal' | 'elite' | 'boss' | 'riftBoss' | 'pinnacle';
  monsters: Array<{ monsterId: Id; levelOffset?: number }>;   // 1–3; MVP 1
  maxDurationMs: 90000 | 150000;
}

interface Dungeon {
  id: Id;                           // 'abandoned_gate', 'decayed_crypt'
  name: LocalizedText;
  levelRange: [number, number];     // [1,7], [8,14]
  zoneLevel: number | 'playerScaled';
  encounters: Encounter[];          // z. B. 3 normal + 1 boss
  bossId: Id;
  lootProfileId: Id;
  baseWeightsProfile: 'physical' | 'caster';
  specialLoot: LocalizedText;
  runRules: { keepRewardsOnDefeat: boolean };   // §2
}

interface RiftConfig {
  tier: number;
  monsterLevel: number;             // min(100, 60 + floor(0.6(t−1)))
  composition: { normal: number; elite: number; boss: 1 };
  modifiers: Id[];
  hpMult: number; dmgMult: number; goldMult: number; materialMult: number; rareWeightMult: number;
}

interface RiftModifierDef {
  id: Id; name: LocalizedText;
  compatibilityGroup: Id;
  mods: StatMod[];                  // Spieler/Monster-Seite markiert
  target: 'player' | 'monsters' | 'elite' | 'boss' | 'both';
  rewards: Array<{ kind: 'quantity' | 'material' | 'essenceChance' | 'shardChance' | 'rareShare' | 'uniqueChance' | 'runeFragmentChance' | 'sigilChance'; value: number }>;
  extraEncounters?: number;
  weight: number;
}
```

## 10. Loot

```ts
interface LootProfile {
  id: Id;
  countDistribution: [number, number, number, number, number];  // P(0..4)
  rarity: { normal: Fraction; magic: Fraction; rare: Fraction; unique: Fraction };
  baseWeights: { weapon: number; armour: number; jewellery: number; relic: number };
  materials: Array<{ materialId: MaterialId; chance: Fraction; min: number; max: number; guaranteed?: boolean }>;
  gold: { multiplier: number };     // Normal 1, Elite 2, Boss 4
  xp: { multiplier: number };       // Normal 1, Elite 1.8, Boss 3.5
  exclusiveUniques?: { pool: Array<{ uniqueId: Id; weight: number }>; chancePerKill: Fraction };   // 0.04
  bossSigils?: { bossId: Id; amount: 2 };
}

type MaterialId = 'FORGE_DUST' | 'ARCANE_SHARD' | 'ESSENCE' | 'CHAOS_FRAGMENT' | 'SEAL_STONE'
  | 'VOID_ASH' | 'SOCKET_CORE' | 'CORRUPTION_CORE' | 'RUNE_FRAGMENT' | 'BOSS_SIGIL' | 'PINNACLE_FRAGMENT';

interface RuneDef {
  id: Id; family: 'angriff' | 'schutz' | 'leben' | 'glut' | 'frost' | 'sturm' | 'schatten' | 'klinge' | 'seuche' | 'fokus' | 'puls' | 'glueck';
  grade: 1 | 2 | 3;
  mods: StatMod[];
}

interface RuneComboDef {            // „Runenverbund“ (D-031), nur 2-Sockel-2H, Grade 3, Reihenfolge fix
  id: Id; first: RuneDef['family']; second: RuneDef['family'];
  effects: EffectHandler[]; mods?: StatMod[];
}
```

## 11. Crafting

```ts
type CraftRecipeId =
  | 'imprint' | 'augment' | 'elevateRare' | 'reforge' | 'supplement' | 'preciseEssence'
  | 'remove' | 'tierUp' | 'perfectT1' | 'refineValues' | 'sealAffix'
  | 'addSocket' | 'insertRune' | 'removeRune' | 'corrupt';

interface CraftRecipe {
  id: CraftRecipeId;
  name: LocalizedText;              // 'Prägen', 'Anreichern', …
  eligible: {
    rarity: Rarity[];
    affixCount?: { min?: number; max?: number; side?: AffixSide };
    minItemLevel?: number;
    requiresFreeSlot?: boolean;
    requiresSelectedAffix?: { tiers?: AffixTier[] };
    notCorrupted: boolean;          // alle außer removeRune
    notFractured: boolean;
  };
  cost: Partial<Record<MaterialId, number>> & { essenceType?: EssenceType | 'any'; runeId?: Id };
  effect: { kind: CraftRecipeId; params?: Record<string, number | string> };
  risk: 'none' | 'rng' | 'deterministic' | 'irreversible';
  phase: 1 | 2 | 3 | 4;
}

interface CraftPreview {             // craftOdds(item, recipe)
  allowed: boolean; reason?: LocalizedText;
  families: Array<{ familyId: Id; probability: Fraction; tiers: Array<{ tier: AffixTier; probability: Fraction; min: number; max: number }> }>;
  cost: Partial<Record<MaterialId, number>>;
}
```

## 12. Commands (§1)

```ts
type Command =
  | { type: 'CREATE_CHARACTER'; name: string; classId: ClassId }
  | { type: 'EQUIP_ITEM'; itemId: Id; slot: SlotId }
  | { type: 'UNEQUIP_ITEM'; slot: SlotId }
  | { type: 'STASH_ITEM'; itemId: Id; tab: number; to: 'stash' | 'inventory' }
  | { type: 'SALVAGE_ITEMS'; itemIds: Id[] }
  | { type: 'SET_PASSIVE'; nodeId: Id; allocate: boolean }
  | { type: 'SET_SKILL_PRIORITY'; apl: AplRule[]; activeSkills?: (Id | null)[] }
  | { type: 'CRAFT_ITEM'; itemId: Id; recipeId: CraftRecipeId; params?: Record<string, string | number>; nonce: string }
  | { type: 'START_RUN'; target: { dungeonId: Id } | { riftTier: number } ; nonce: string }
  | { type: 'RESOLVE_RUN'; runId: Id }
  | { type: 'CLAIM_REWARDS'; runId: Id }
  | { type: 'SET_LOOT_FILTER'; filter: LootFilter }
  | { type: 'RESET_BUILD'; scope: 'talents' | 'single'; nodeId?: Id }
  | { type: 'SAVE_PRESET'; name: string }
  | { type: 'LOAD_PRESET'; presetId: Id };

type CommandResult =
  | { ok: true; state: SaveGame; events: DomainEvent[] }
  | { ok: false; error: { code: string; message: LocalizedText } };   // State unverändert (Rollback)
```

`nonce` macht `CRAFT_ITEM`/`START_RUN` idempotent (bereits verarbeitete Nonce → gleiches Ergebnis, keine Doppelabbuchung).

## 13. Run und Kampf

```ts
interface Run {
  id: Id; seed: number;
  target: { dungeonId: Id } | { riftTier: number; modifiers: Id[] };
  characterSnapshotHash: string;
  encounters: Array<{ encounterId: Id; result: 'victory' | 'defeat' | 'timeout' | 'pending'; combatSeedLabel: string; eventHash?: string }>;
  status: 'active' | 'resolved' | 'claimed';
  rewards: PendingRewards;
}

interface PendingRewards {
  items: Item[]; gold: number; xp: number;
  materials: Partial<Record<MaterialId, number>>;
  claimed: boolean;                 // CLAIM_REWARDS idempotent
}

interface CombatResult {             // nicht dauerhaft im Primär-Snapshot (§17)
  seed: number; configVersion: string;
  outcome: 'victory' | 'defeat' | 'timeout';
  durationMs: Ms;
  events: CombatEvent[];             // siehe EVENT_ORDER.md §8
  eventHash: string;
}
```

## 14. SaveGame

```ts
interface SaveGame {
  saveSchemaVersion: number;        // Struktur des Saves; Migrationen in persistence/migrations.ts
  balanceVersion: number;           // 1 — Zahlenwerte (balance.ts)
  contentVersion: string;           // Content-Katalog (IDs/Definitionen), z. B. '0.1.0'
  createdAt: string; updatedAt: string;   // ISO, nur Metadaten (nicht Engine-relevant)
  commandSeq: number;               // monotone Command-Nummer
  processedNonces: string[];        // begrenzt (z. B. letzte 256)
  rngRootSeed: number;
  activeCharacterId: Id | null;
  characters: Record<Id, Character>;
  items: Record<Id, Item>;          // normalisiert; Ort über Referenzen
  inventory: { capacity: 60; itemIds: Id[] };
  stash: { tabs: Array<{ id: Id; name: string; slots: 48; itemIds: (Id | null)[] }>; purchasedTabs: number };
  materials: Partial<Record<MaterialId, number>> & { essences?: Partial<Record<EssenceType, number>>; runes?: Record<Id, number> };
  gold: number;
  runs: { active?: Run; pendingRewards: PendingRewards[] };
  lootFilter: LootFilter;
  presets: Array<{ id: Id; name: string; characterId: Id; equipment: Partial<Record<SlotId, Id>>; talents: Id[]; skills: Character['skills'] }>;
  settings: { animationSpeed: 1 | 2 | 4; animations: boolean; audio: boolean; tooltipsDetailed: boolean };
  telemetry: { triggerSuppressed: number; failedUniqueRolls: number };
  checksum: string;                 // über kanonisches JSON ohne checksum-Feld; nur Korruptionserkennung
}

interface LootFilter {
  rules: Array<{ rarity?: Rarity[]; minItemLevel?: number; slotTypes?: string[]; action: 'show' | 'hide' | 'highlight' | 'autoSalvage' }>;
  autoSalvageConfirmed: boolean;    // Unique/Locked/Favorit nie automatisch
}
```

Invarianten (Validator, nach jedem Command):
1. Jede Item-ID genau an einem Ort (Inventar | Stash | Equipment | PendingRewards).
2. Keine negativen Materialien/Gold.
3. Rarity-Grenzen: magic ≤1P+1S, rare ≤3P+3S, ≤6 explizit; max 1 Mod pro `groupId`; max 1 T0.
4. 2H in `mainHand` ⇒ `offHand` leer.
5. `ringA !== ringB`.
6. Alle Zahlen endlich; Wahrscheinlichkeiten in [0,1].
7. `checksum` passt; sonst Reparatur/Backup (§17).

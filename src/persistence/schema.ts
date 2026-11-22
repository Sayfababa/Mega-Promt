/**
 * Zod runtime schema for the persisted GameState (spec 1 / 17).
 * Validates structure, number sanity (no NaN/Infinity, non-negative counters) and referential
 * integrity (every referenced item uid exists, no item in two places).
 */
import { z } from 'zod';
import { EQUIP_SLOTS, MATERIAL_IDS } from '../engine/types';
import type { GameState } from '../engine/state/gameState';
import { SAVE_SCHEMA_VERSION } from '../content/balance';

const num = z.number();
const nonNeg = z.number().min(0);
const int = z.number().int();
const nonNegInt = z.number().int().min(0);

const RaritySchema = z.enum(['normal', 'magic', 'rare', 'unique']);
const PriorityConditionSchema = z.enum(['always', 'selfHpBelow35', 'selfHpBelow40', 'barrierBelow15', 'buffMissing', 'targetHpBelow25', 'targetBleedStacks3']);
const DamageTypeSchema = z.enum(['physical', 'fire', 'cold', 'lightning', 'shadow']);

const materialShape = Object.fromEntries(MATERIAL_IDS.map((m) => [m, nonNegInt])) as Record<(typeof MATERIAL_IDS)[number], typeof nonNegInt>;
export const MaterialsSchema = z.object(materialShape);
const PartialMaterialsSchema = z.object(materialShape).partial();

const equipmentShape = Object.fromEntries(EQUIP_SLOTS.map((s) => [s, z.string().nullable()])) as Record<(typeof EQUIP_SLOTS)[number], z.ZodNullable<z.ZodString>>;
const EquipmentSchema = z.object(equipmentShape);

const PriorityRuleSchema = z.object({ skillId: z.string(), condition: PriorityConditionSchema });

const AffixInstanceSchema = z.object({
  familyId: z.string(),
  tier: z.number().int().min(0).max(5),
  values: z.array(num),
  sealed: z.boolean().optional(),
});

const HistoryEntrySchema = z.object({
  action: z.string(),
  detail: z.string().optional(),
  seed: num.optional(),
  prevHash: z.string().optional(),
  newHash: z.string().optional(),
});

export const ItemInstanceSchema = z.object({
  uid: z.string().min(1),
  baseId: z.string().min(1),
  rarity: RaritySchema,
  itemLevel: z.number().int().min(1).max(100),
  prefixes: z.array(AffixInstanceSchema).max(3),
  suffixes: z.array(AffixInstanceSchema).max(3),
  uniqueId: z.string().optional(),
  uniqueRolls: z.array(num).optional(),
  sockets: nonNegInt,
  runes: z.array(z.string()),
  corrupted: z.boolean(),
  fractured: z.boolean(),
  locked: z.boolean(),
  favorite: z.boolean(),
  source: z.string(),
  history: z.array(HistoryEntrySchema),
});

const CharacterSchema = z.object({
  name: z.string().min(2).max(20),
  classId: z.string(),
  level: z.number().int().min(1).max(100),
  xp: nonNeg,
  allocated: z.object({ str: nonNegInt, dex: nonNegInt, int: nonNegInt, vit: nonNegInt }),
  unspentAttributePoints: nonNegInt,
  passives: z.array(z.string()),
  activeSkills: z.array(z.string()).max(4),
  priority: z.array(PriorityRuleSchema),
  equipment: EquipmentSchema,
  freeResetUsed: z.boolean(),
  flags: z.object({ firstDungeonDone: z.boolean(), rareGuaranteeDone: z.boolean() }),
  dungeonProgress: z.record(z.string(), int),
});

// ---- combat snapshot (player spec used for exact replay)
const condition = z.string().optional();
const ModifierSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('stat'), stat: z.string(), value: num, cond: condition }),
  z.object({ type: z.literal('inc'), tags: z.array(z.string()), value: num, cond: condition }),
  z.object({ type: z.literal('more'), group: z.string(), tags: z.array(z.string()), value: num, cond: condition }),
]);

const TriggerDefSchema = z.object({
  effectId: z.string(),
  event: z.string(),
  chance: num,
  icdMs: num,
  effect: z.looseObject({ kind: z.string() }),
  requireTags: z.array(z.string()).optional(),
});

const DerivedStatsSchema = z.object({
  level: int,
  str: num, dex: num, int: num, vit: num,
  maxHP: num, maxMana: num, armorFlat: num,
  weapon: z.object({
    min: num, max: num, aps: num, crit: num,
    hands: z.union([z.literal(1), z.literal(2)]),
    elemental: z.partialRecord(DamageTypeSchema, z.object({ min: num, max: num })),
    familyId: z.string(),
    casterEligible: z.boolean(),
  }),
  hasShield: z.boolean(),
  stats: z.record(z.string(), num),
  conditionalStats: z.array(ModifierSchema),
  incMods: z.array(ModifierSchema),
  moreMods: z.array(ModifierSchema),
  triggers: z.array(TriggerDefSchema),
  special: z.object({ finisherMoreAtBleedStacks: z.object({ stacks: num, more: num }).optional() }),
  hpRegen: num,
  manaRegen: num,
  uniqueIds: z.array(z.string()),
});

const CombatantSpecSchema = z.object({
  id: z.string(),
  name: z.string(),
  side: z.enum(['player', 'enemy']),
  level: int,
  isBoss: z.boolean(),
  derived: DerivedStatsSchema,
  activeSkills: z.array(z.string()).optional(),
  priority: z.array(PriorityRuleSchema).optional(),
  monster: z.looseObject({ id: z.string() }).optional(),
  monsterHit: num.optional(),
});

const EncounterRecordSchema = z.object({
  index: nonNegInt,
  monsterId: z.string(),
  type: z.enum(['normal', 'elite', 'boss', 'riftboss']),
  level: int,
  seed: nonNegInt,
  outcome: z.enum(['victory', 'defeat', 'timeout']),
  durationMs: nonNeg,
  eventHash: z.string(),
  playerHpEnd: num,
  playerMaxHp: num,
  enemyMaxHp: num,
  metrics: z.object({
    damageBySource: z.record(z.string(), num),
    directDamage: num, dotDamage: num, damageTaken: num, oomMs: num, actions: num,
    triggers: num, suppressed: num, crits: num, blocks: num, evades: num,
  }),
  xp: nonNeg,
  gold: nonNeg,
  materials: PartialMaterialsSchema,
});

const RunStateSchema = z.object({
  id: z.string(),
  dungeonId: z.string(),
  monsterLevel: int,
  seed: nonNegInt,
  status: z.enum(['started', 'resolved']),
  victory: z.boolean().optional(),
  encounters: z.array(EncounterRecordSchema),
  playerSnapshot: CombatantSpecSchema.optional(),
  rewards: z.object({ xp: nonNeg, gold: nonNeg, materials: PartialMaterialsSchema, itemUids: z.array(z.string()) }).optional(),
  claimed: z.boolean(),
  levelUps: int.optional(),
});

const BuildPresetSchema = z.object({
  name: z.string(),
  passives: z.array(z.string()),
  activeSkills: z.array(z.string()),
  priority: z.array(PriorityRuleSchema),
  equipment: EquipmentSchema,
});

const CraftLogEntrySchema = z.object({
  t: num,
  itemUid: z.string(),
  recipe: z.string(),
  cost: PartialMaterialsSchema,
  seed: nonNegInt,
  prevHash: z.string(),
  newHash: z.string(),
  summary: z.string(),
});

export const GameStateSchema = z
  .object({
    saveSchemaVersion: z.literal(SAVE_SCHEMA_VERSION),
    balanceVersion: z.number().int().min(1),
    contentVersion: z.number().int().min(1),
    seed: nonNegInt,
    commandCounter: nonNegInt,
    nextItemId: z.number().int().min(1),
    character: CharacterSchema.nullable(),
    items: z.record(z.string(), ItemInstanceSchema),
    inventory: z.array(z.string()),
    stash: z.array(z.string()),
    pendingRewards: z.array(z.string()),
    materials: MaterialsSchema,
    gold: nonNegInt,
    activeRun: RunStateSchema.nullable(),
    runHistory: z.array(z.object({ id: z.string(), dungeonId: z.string(), monsterLevel: int, victory: z.boolean(), encounters: nonNegInt })),
    craftLog: z.array(CraftLogEntrySchema),
    lootFilter: z.object({ minVisibleRarity: RaritySchema, autoSalvageNormal: z.boolean() }),
    presets: z.record(z.string(), BuildPresetSchema),
  })
  .superRefine((s, ctx) => {
    for (const [key, item] of Object.entries(s.items)) {
      if (item.uid !== key) ctx.addIssue({ code: 'custom', message: `Gegenstand ${key} hat abweichende uid ${item.uid}.`, path: ['items', key] });
    }
    const seen = new Map<string, string>();
    const place = (uid: string, where: string): void => {
      if (!s.items[uid]) ctx.addIssue({ code: 'custom', message: `${where} verweist auf fehlenden Gegenstand ${uid}.`, path: [where] });
      const prev = seen.get(uid);
      if (prev) ctx.addIssue({ code: 'custom', message: `Gegenstand ${uid} liegt doppelt (${prev} und ${where}).`, path: [where] });
      seen.set(uid, where);
    };
    s.inventory.forEach((u) => place(u, 'inventory'));
    s.stash.forEach((u) => place(u, 'stash'));
    s.pendingRewards.forEach((u) => place(u, 'pendingRewards'));
    if (s.character) for (const slot of EQUIP_SLOTS) {
      const u = s.character.equipment[slot];
      if (u) place(u, `equipment.${slot}`);
    }
  });

export type ValidationResult = { ok: true; state: GameState } | { ok: false; error: string };

/** validates an unknown value as GameState; error messages are German and point at the first problem */
export function validateGameState(value: unknown): ValidationResult {
  const r = GameStateSchema.safeParse(value);
  if (r.success) return { ok: true, state: r.data as unknown as GameState };
  const first = r.error.issues[0];
  const path = first?.path.length ? first.path.join('.') : '(Wurzel)';
  return { ok: false, error: `Spielstand ungültig bei „${path}“: ${first?.message ?? 'unbekannter Fehler'}` };
}

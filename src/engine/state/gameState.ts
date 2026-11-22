/** Persisted game state shape (normalised: items stored once by uid). */
import { BALANCE_VERSION, CONTENT_VERSION, SAVE_SCHEMA_VERSION } from '../../content/balance';
import type { EquipSlot, ItemInstance, Materials, PriorityRule, Rarity } from '../types';
import { EQUIP_SLOTS } from '../types';
import type { EncounterOutcome } from '../run/run';
import type { CombatantSpec } from '../combat/simulate';
import { emptyMaterials } from '../run/run';

export interface CharacterState {
  name: string;
  classId: string;
  level: number;
  xp: number;
  allocated: { str: number; dex: number; int: number; vit: number };
  unspentAttributePoints: number;
  passives: string[];
  activeSkills: string[];
  priority: PriorityRule[];
  equipment: Record<EquipSlot, string | null>;
  freeResetUsed: boolean;
  flags: { firstDungeonDone: boolean; rareGuaranteeDone: boolean };
  dungeonProgress: Record<string, number>;
}

export interface RunState {
  id: string;
  dungeonId: string;
  monsterLevel: number;
  seed: number;
  status: 'started' | 'resolved';
  victory?: boolean;
  encounters: Omit<EncounterOutcome, 'items'>[];
  /** player snapshot used for the fights → exact replay */
  playerSnapshot?: CombatantSpec;
  rewards?: { xp: number; gold: number; materials: Partial<Materials>; itemUids: string[] };
  claimed: boolean;
  levelUps?: number;
}

export interface LootFilter {
  /** items below this rarity are hidden in the inventory view (visibility only) */
  minVisibleRarity: Rarity;
  /** explicit, confirmed rule: auto-salvage normal items on claim (never unique/locked/favourite) */
  autoSalvageNormal: boolean;
}

export interface BuildPreset {
  name: string;
  passives: string[];
  activeSkills: string[];
  priority: PriorityRule[];
  equipment: Record<EquipSlot, string | null>;
}

export interface CraftLogEntry {
  t: number;
  itemUid: string;
  recipe: string;
  cost: Partial<Materials>;
  seed: number;
  prevHash: string;
  newHash: string;
  summary: string;
}

export interface GameState {
  saveSchemaVersion: number;
  balanceVersion: number;
  contentVersion: number;
  seed: number;
  commandCounter: number;
  nextItemId: number;
  character: CharacterState | null;
  items: Record<string, ItemInstance>;
  inventory: string[];
  stash: string[];
  pendingRewards: string[];
  materials: Materials;
  gold: number;
  activeRun: RunState | null;
  runHistory: { id: string; dungeonId: string; monsterLevel: number; victory: boolean; encounters: number }[];
  craftLog: CraftLogEntry[];
  lootFilter: LootFilter;
  presets: Record<string, BuildPreset>;
}

export function emptyEquipment(): Record<EquipSlot, string | null> {
  return Object.fromEntries(EQUIP_SLOTS.map((s) => [s, null])) as Record<EquipSlot, string | null>;
}

export function newGameState(seed: number): GameState {
  return {
    saveSchemaVersion: SAVE_SCHEMA_VERSION,
    balanceVersion: BALANCE_VERSION,
    contentVersion: CONTENT_VERSION,
    seed: seed >>> 0,
    commandCounter: 0,
    nextItemId: 1,
    character: null,
    items: {},
    inventory: [],
    stash: [],
    pendingRewards: [],
    materials: emptyMaterials(),
    gold: 0,
    activeRun: null,
    runHistory: [],
    craftLog: [],
    lootFilter: { minVisibleRarity: 'normal', autoSalvageNormal: false },
    presets: {},
  };
}

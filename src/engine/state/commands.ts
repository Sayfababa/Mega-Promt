/**
 * Typed commands — the ONLY way to change GameState (spec 1).
 * applyCommand(state, cmd) is pure: it works on a structured clone and either returns the complete
 * next state (one atomic commit) or an error with the ORIGINAL state untouched (rollback by design).
 * Randomness: per-command seed = deriveSeed(state.seed, 'cmd', commandCounter).
 */
import { B } from '../../content/balance';
import { CLASS_BY_ID } from '../../content/classes/classes';
import { getBase } from '../../content/bases/bases';
import { AFFIXES } from '../../content/affixes/affixes';
import { DUNGEON_BY_ID } from '../../content/dungeons/dungeons';
import { PASSIVE_TREES } from '../../content/passives/guardian';
import { SKILL_BY_ID } from '../../content/skills/guardian';
import { deriveSeed, Rng } from '../core/rng';
import { hashOf } from '../core/hash';
import { aggregate, type DerivedStats } from '../stats/aggregate';
import { defaultPriority, playerCombatant } from '../combat/combatants';
import { applyXp, respecPointCost, talentPointsForLevel } from '../progression/levels';
import { resolveRun, type RunConfig } from '../run/run';
import { affixRngs, blankItem, emptyTelemetry, generateItem, requiredLevel } from '../loot/generator';
import { addRandomAffix } from '../loot/affixRoll';
import { applyCraft, hasMaterials, RECIPE_BY_ID, validateCraft, type CraftParams, type RecipeId } from '../crafting/recipes';
import { emptyEquipment, newGameState, type GameState, type LootFilter } from './gameState';
import type { EquipSlot, ItemInstance, MaterialId, PriorityCondition, PriorityRule, Rarity } from '../types';
import { EQUIP_SLOTS } from '../types';

export type Command =
  | { type: 'CREATE_CHARACTER'; name: string; classId: string }
  | { type: 'ALLOCATE_ATTRIBUTE'; attr: 'str' | 'dex' | 'int' | 'vit'; amount: number }
  | { type: 'EQUIP_ITEM'; uid: string; slot?: EquipSlot }
  | { type: 'UNEQUIP_ITEM'; slot: EquipSlot }
  | { type: 'STASH_ITEM'; uid: string; to: 'stash' | 'inventory' }
  | { type: 'SALVAGE_ITEMS'; uids: string[] }
  | { type: 'TOGGLE_LOCK'; uid: string }
  | { type: 'SET_PASSIVE'; nodeId: string; allocate: boolean }
  | { type: 'SET_ACTIVE_SKILLS'; skills: string[] }
  | { type: 'SET_SKILL_PRIORITY'; rules: PriorityRule[] }
  | { type: 'CRAFT_ITEM'; uid: string; recipe: RecipeId; params?: CraftParams }
  | { type: 'START_RUN'; dungeonId: string; monsterLevel: number }
  | { type: 'RESOLVE_RUN' }
  | { type: 'CLAIM_REWARDS' }
  | { type: 'MOVE_PENDING_TO_INVENTORY' }
  | { type: 'SET_LOOT_FILTER'; filter: LootFilter }
  | { type: 'RESET_BUILD' }
  | { type: 'SAVE_PRESET'; name: string }
  | { type: 'LOAD_PRESET'; name: string };

export type CommandResult =
  | { ok: true; state: GameState; message?: string }
  | { ok: false; state: GameState; error: string };

class CommandError extends Error {}
const fail = (msg: string): never => {
  throw new CommandError(msg);
};

export const PRIORITY_CONDITIONS: PriorityCondition[] = ['always', 'selfHpBelow35', 'selfHpBelow40', 'barrierBelow15', 'buffMissing', 'targetHpBelow25', 'targetBleedStacks3'];

// ------------------------------------------------------------------ derived helpers
export function equippedItems(s: GameState): Partial<Record<EquipSlot, ItemInstance>> {
  const out: Partial<Record<EquipSlot, ItemInstance>> = {};
  if (!s.character) return out;
  for (const slot of EQUIP_SLOTS) {
    const uid = s.character.equipment[slot];
    if (uid && s.items[uid]) out[slot] = s.items[uid];
  }
  return out;
}

export function derivedFor(s: GameState): DerivedStats {
  const c = s.character ?? fail('Kein Charakter.');
  return aggregate({ classId: c.classId, level: c.level, allocated: c.allocated, equipment: equippedItems(s), passives: c.passives });
}

export function talentPointsAvailable(s: GameState): number {
  const c = s.character!;
  return talentPointsForLevel(c.level) - c.passives.filter((p) => !p.endsWith('_root')).length;
}

export function allowedMonsterLevels(s: GameState, dungeonId: string): { min: number; max: number } {
  const d = DUNGEON_BY_ID[dungeonId] ?? fail('Unbekannter Dungeon.');
  const cleared = s.character?.dungeonProgress[dungeonId] ?? d.minLevel - 1;
  return { min: d.minLevel, max: Math.min(d.maxLevel, Math.max(d.minLevel, cleared + 1)) };
}

function newUid(s: GameState): string {
  return `i${s.nextItemId++}`;
}

function addItem(s: GameState, item: ItemInstance): string {
  const uid = newUid(s);
  s.items[uid] = { ...item, uid };
  return uid;
}

function locationOf(s: GameState, uid: string): 'inventory' | 'stash' | 'pending' | EquipSlot | null {
  if (s.inventory.includes(uid)) return 'inventory';
  if (s.stash.includes(uid)) return 'stash';
  if (s.pendingRewards.includes(uid)) return 'pending';
  if (s.character) for (const slot of EQUIP_SLOTS) if (s.character.equipment[slot] === uid) return slot;
  return null;
}

function slotsFor(item: ItemInstance): EquipSlot[] {
  const k = getBase(item.baseId).kind;
  switch (k) {
    case 'weapon1h': case 'weapon2h': return ['mainhand'];
    case 'offhand': return ['offhand'];
    case 'ring': return ['ringA', 'ringB'];
    default: return [k as EquipSlot];
  }
}

function isConnected(tree: { id: string; edges: string[] }[], allocated: string[]): boolean {
  const set = new Set(allocated);
  const root = tree.find((n) => n.id.endsWith('_root'));
  if (!root) return false;
  const seen = new Set<string>([root.id]);
  const queue = [root.id];
  while (queue.length) {
    const id = queue.shift()!;
    const node = tree.find((n) => n.id === id)!;
    for (const e of node.edges) if (set.has(e) && !seen.has(e)) { seen.add(e); queue.push(e); }
  }
  return allocated.every((a) => seen.has(a));
}

function addMaterials(s: GameState, m: Partial<Record<MaterialId, number>>, sign = 1): void {
  for (const [k, v] of Object.entries(m) as [MaterialId, number][]) {
    s.materials[k] = (s.materials[k] ?? 0) + sign * v;
    if (s.materials[k] < 0) fail('Materialsaldo würde negativ.');
  }
}

export function runConfigFor(dungeonId: string, monsterLevel: number): RunConfig {
  const d = DUNGEON_BY_ID[dungeonId] ?? fail('Unbekannter Dungeon.');
  return { id: d.id, name: d.name, encounters: d.encounters, monsterLevel, baseWeights: d.baseWeights, baseFamilies: d.baseFamilies, keepRewardsOnDefeat: d.keepRewardsOnDefeat };
}

const RARITY_ORDER: Rarity[] = ['normal', 'magic', 'rare', 'unique'];

// ------------------------------------------------------------------ reducer
export function applyCommand(state: GameState, cmd: Command): CommandResult {
  try {
    const s: GameState = structuredClone(state);
    const seed = deriveSeed(s.seed, 'cmd', s.commandCounter);
    s.commandCounter++;
    const message = execute(s, cmd, seed);
    return { ok: true, state: s, message };
  } catch (e) {
    if (e instanceof CommandError) return { ok: false, state, error: e.message };
    throw e;
  }
}

function execute(s: GameState, cmd: Command, seed: number): string | undefined {
  if (cmd.type !== 'CREATE_CHARACTER' && !s.character) fail('Zuerst einen Charakter erstellen.');
  const c = s.character!;
  switch (cmd.type) {
    case 'CREATE_CHARACTER': {
      if (s.character) fail('Es existiert bereits ein Charakter.');
      const cls = CLASS_BY_ID[cmd.classId] ?? fail('Unbekannte Klasse.');
      if (!cls.playable) fail(`${cls.name} ist im Vertical Slice noch nicht spielbar.`);
      const name = cmd.name.trim();
      if (name.length < 2 || name.length > 20) fail('Name muss 2–20 Zeichen lang sein.');
      const fresh = newGameState(s.seed);
      Object.assign(s, fresh, { commandCounter: s.commandCounter });
      const equipment = emptyEquipment();
      const starter = cls.starterItems.map((b) => addItem(s, { ...blankItem(getBase(b), 1, 'normal', 'Startausrüstung'), history: [{ action: 'starter' }] }));
      for (const uid of starter) equipment[slotsFor(s.items[uid]!)[0]!] = uid;
      const active = cls.skills.filter((id) => SKILL_BY_ID[id]!.unlockLevel <= 1);
      s.character = {
        name, classId: cls.id, level: 1, xp: 0, allocated: { str: 0, dex: 0, int: 0, vit: 0 }, unspentAttributePoints: 0,
        passives: (PASSIVE_TREES[cls.passiveTree] ?? []).filter((n) => n.size === 'root').map((n) => n.id), activeSkills: active, priority: defaultPriority(active),
        equipment, freeResetUsed: false, flags: { firstDungeonDone: false, rareGuaranteeDone: false }, dungeonProgress: {},
      };
      return `${name} erwacht.`;
    }
    case 'ALLOCATE_ATTRIBUTE': {
      if (!Number.isInteger(cmd.amount) || cmd.amount < 1) fail('Ungültige Punktzahl.');
      if (c.unspentAttributePoints < cmd.amount) fail('Nicht genug freie Attributpunkte.');
      c.allocated[cmd.attr] += cmd.amount;
      c.unspentAttributePoints -= cmd.amount;
      return undefined;
    }
    case 'EQUIP_ITEM': {
      const item = s.items[cmd.uid] ?? fail('Gegenstand existiert nicht.');
      if (locationOf(s, cmd.uid) !== 'inventory') fail('Nur Gegenstände aus dem Inventar können ausgerüstet werden.');
      const allowed = slotsFor(item);
      const slot = cmd.slot ?? (allowed.find((x) => !c.equipment[x]) ?? allowed[0]!);
      if (!allowed.includes(slot)) fail('Dieser Gegenstand passt nicht in diesen Slot.');
      const req = requiredLevel(item);
      if (c.level < req) fail(`Benötigt Stufe ${req}.`);
      const base = getBase(item.baseId);
      if (slot === 'offhand' && c.equipment.mainhand && getBase(s.items[c.equipment.mainhand]!.baseId).weapon?.hands === 2) fail('Eine Zweihandwaffe sperrt die Nebenhand.');
      s.inventory = s.inventory.filter((u) => u !== cmd.uid);
      const prev = c.equipment[slot];
      if (prev) s.inventory.push(prev);
      c.equipment[slot] = cmd.uid;
      if (slot === 'mainhand' && base.weapon?.hands === 2 && c.equipment.offhand) {
        if (s.inventory.length >= B.inventorySize) fail('Inventar voll: Nebenhand kann nicht abgelegt werden.');
        s.inventory.push(c.equipment.offhand);
        c.equipment.offhand = null;
      }
      if (s.inventory.length > B.inventorySize) fail('Inventar voll.');
      return `${base.name} ausgerüstet.`;
    }
    case 'UNEQUIP_ITEM': {
      const uid = c.equipment[cmd.slot] ?? fail('Slot ist leer.');
      if (s.inventory.length >= B.inventorySize) fail('Inventar voll.');
      c.equipment[cmd.slot] = null;
      s.inventory.push(uid);
      return undefined;
    }
    case 'STASH_ITEM': {
      const loc = locationOf(s, cmd.uid);
      if (cmd.to === 'stash') {
        if (loc !== 'inventory') fail('Gegenstand ist nicht im Inventar.');
        if (s.stash.length >= B.stashTabSize) fail('Truhe voll.');
        s.inventory = s.inventory.filter((u) => u !== cmd.uid);
        s.stash.push(cmd.uid);
      } else {
        if (loc !== 'stash') fail('Gegenstand ist nicht in der Truhe.');
        if (s.inventory.length >= B.inventorySize) fail('Inventar voll.');
        s.stash = s.stash.filter((u) => u !== cmd.uid);
        s.inventory.push(cmd.uid);
      }
      return undefined;
    }
    case 'TOGGLE_LOCK': {
      const item = s.items[cmd.uid] ?? fail('Gegenstand existiert nicht.');
      item.locked = !item.locked;
      return undefined;
    }
    case 'SALVAGE_ITEMS': {
      if (cmd.uids.length === 0) fail('Keine Gegenstände gewählt.');
      if (new Set(cmd.uids).size !== cmd.uids.length) fail('Doppelte Auswahl.');
      const rng = new Rng(seed);
      const gained: Partial<Record<MaterialId, number>> = {};
      for (const uid of cmd.uids) {
        const item = s.items[uid] ?? fail('Gegenstand existiert nicht.');
        const loc = locationOf(s, uid);
        if (loc !== 'inventory' && loc !== 'stash' && loc !== 'pending') fail('Ausgerüstete Gegenstände können nicht verwertet werden.');
        if (item.locked) fail('Gesperrte Gegenstände können nicht verwertet werden.');
        for (const [m, range] of Object.entries(B.salvage[item.rarity]) as [MaterialId, [number, number]][]) gained[m] = (gained[m] ?? 0) + rng.int(range[0], range[1]);
        s.inventory = s.inventory.filter((u) => u !== uid);
        s.stash = s.stash.filter((u) => u !== uid);
        s.pendingRewards = s.pendingRewards.filter((u) => u !== uid);
        delete s.items[uid];
      }
      addMaterials(s, gained);
      return `Verwertet: ${Object.entries(gained).map(([k, v]) => `${v}× ${k}`).join(', ')}`;
    }
    case 'SET_PASSIVE': {
      const tree = PASSIVE_TREES[CLASS_BY_ID[c.classId]!.passiveTree] ?? [];
      const node = tree.find((n) => n.id === cmd.nodeId) ?? fail('Unbekannter Knoten.');
      if (node.size === 'root') fail('Der Startknoten ist immer aktiv.');
      if (cmd.allocate) {
        if (c.passives.includes(node.id)) fail('Bereits gelernt.');
        if (talentPointsAvailable(s) < 1) fail('Keine freien Talentpunkte.');
        if (!node.edges.some((e) => c.passives.includes(e))) fail('Knoten ist nicht mit dem Baum verbunden.');
        c.passives.push(node.id);
      } else {
        if (!c.passives.includes(node.id)) fail('Knoten ist nicht gelernt.');
        const next = c.passives.filter((p) => p !== node.id);
        if (!isConnected(tree, next)) fail('Entfernen würde andere Knoten vom Baum trennen.');
        const cost = respecPointCost(c.level);
        if (s.gold < cost) fail(`Rückerstattung kostet ${cost} Gold.`);
        s.gold -= cost;
        c.passives = next;
        return `Punkt für ${cost} Gold zurückerstattet.`;
      }
      return undefined;
    }
    case 'RESET_BUILD': {
      const cost = c.freeResetUsed ? B.respecFullMultiplier * respecPointCost(c.level) : 0;
      if (s.gold < cost) fail(`Gesamtrücksetzung kostet ${cost} Gold.`);
      s.gold -= cost;
      c.freeResetUsed = true;
      c.passives = c.passives.filter((p) => p.endsWith('_root'));
      const total = Object.values(c.allocated).reduce((a, b) => a + b, 0);
      c.allocated = { str: 0, dex: 0, int: 0, vit: 0 };
      c.unspentAttributePoints += total;
      return cost === 0 ? 'Erste Rücksetzung kostenlos.' : `Rücksetzung für ${cost} Gold.`;
    }
    case 'SET_ACTIVE_SKILLS': {
      if (cmd.skills.length > B.activeSkillSlots) fail(`Maximal ${B.activeSkillSlots} aktive Skills.`);
      if (new Set(cmd.skills).size !== cmd.skills.length) fail('Skill doppelt gewählt.');
      const cls = CLASS_BY_ID[c.classId]!;
      for (const id of cmd.skills) {
        const sk = SKILL_BY_ID[id] ?? fail('Unbekannter Skill.');
        if (!cls.skills.includes(id)) fail('Skill gehört nicht zur Klasse.');
        if (sk.unlockLevel > c.level) fail(`${sk.name} wird ab Stufe ${sk.unlockLevel} freigeschaltet.`);
      }
      c.activeSkills = [...cmd.skills];
      const kept = c.priority.filter((r) => cmd.skills.includes(r.skillId));
      for (const id of cmd.skills) if (!kept.some((r) => r.skillId === id)) kept.push({ skillId: id, condition: SKILL_BY_ID[id]!.defaultCondition });
      c.priority = kept;
      return undefined;
    }
    case 'SET_SKILL_PRIORITY': {
      const ids = cmd.rules.map((r) => r.skillId);
      if (new Set(ids).size !== ids.length) fail('Skill doppelt in der Priorität.');
      if (ids.length !== c.activeSkills.length || !ids.every((id) => c.activeSkills.includes(id))) fail('Priorität muss genau die aktiven Skills enthalten.');
      for (const r of cmd.rules) if (!PRIORITY_CONDITIONS.includes(r.condition)) fail('Ungültige Bedingung.');
      c.priority = cmd.rules.map((r) => ({ skillId: r.skillId, condition: r.condition }));
      return undefined;
    }
    case 'CRAFT_ITEM': {
      const item = s.items[cmd.uid] ?? fail('Gegenstand existiert nicht.');
      const loc = locationOf(s, cmd.uid);
      if (loc === 'pending' || loc === null) fail('Gegenstand muss im Inventar, in der Truhe oder ausgerüstet sein.');
      const recipe = RECIPE_BY_ID[cmd.recipe] ?? fail('Unbekanntes Rezept.');
      const err = validateCraft(item, cmd.recipe, cmd.params ?? {});
      if (err) fail(err);
      if (!hasMaterials(s.materials, recipe.cost)) fail('Nicht genug Materialien.');
      const out = applyCraft(item, cmd.recipe, cmd.params ?? {}, seed);
      addMaterials(s, recipe.cost, -1);
      s.items[cmd.uid] = out.item;
      s.craftLog.push({ t: s.commandCounter, itemUid: cmd.uid, recipe: cmd.recipe, cost: recipe.cost, seed, prevHash: hashOf(item), newHash: hashOf(out.item), summary: out.summary });
      if (s.craftLog.length > 50) s.craftLog = s.craftLog.slice(-50);
      return `${recipe.name}: ${out.summary}`;
    }
    case 'START_RUN': {
      if (s.activeRun && !s.activeRun.claimed) fail('Es gibt einen offenen Run. Zuerst Belohnungen abholen.');
      const lv = allowedMonsterLevels(s, cmd.dungeonId);
      if (!Number.isInteger(cmd.monsterLevel) || cmd.monsterLevel < lv.min || cmd.monsterLevel > lv.max) fail(`Erlaubte Stufe: ${lv.min}–${lv.max}.`);
      s.activeRun = { id: `run${s.commandCounter}`, dungeonId: cmd.dungeonId, monsterLevel: cmd.monsterLevel, seed, status: 'started', encounters: [], claimed: false };
      return undefined;
    }
    case 'RESOLVE_RUN': {
      const run = s.activeRun ?? fail('Kein gestarteter Run.');
      if (run.status !== 'started') fail('Run wurde bereits ausgewertet.');
      const derived = derivedFor(s);
      const player = playerCombatant(c.name, derived, c.activeSkills, c.priority);
      const cfg = runConfigFor(run.dungeonId, run.monsterLevel);
      const res = resolveRun(player, cfg, run.seed, { magicFind: derived.stats.magicFind ?? 0, goldFind: derived.stats.goldFind ?? 0, playerLevel: c.level });
      const items = [...res.totals.items];
      // frustration protection (spec 7)
      if (res.victory && !c.flags.firstDungeonDone) {
        c.flags.firstDungeonDone = true;
        items.push(guaranteedWeaponUpgrade(s, derived, cfg, run.seed));
      }
      const bossWon = res.encounters.some((e) => (e.type === 'boss' || e.type === 'riftboss') && e.outcome === 'victory');
      if (bossWon && c.level >= 10 && !c.flags.rareGuaranteeDone) {
        c.flags.rareGuaranteeDone = true;
        const tel = emptyTelemetry();
        const rare = generateItem({ seed: deriveSeed(run.seed, 'rareGuarantee'), encounterType: 'boss', monsterLevel: run.monsterLevel, baseWeights: cfg.baseWeights, baseFamilies: cfg.baseFamilies, magicFind: 0, source: `${cfg.name} · Garantie` }, 0, tel, { forceRarity: 'rare', rareMinAffixes: 4 });
        rare.history.push({ action: 'guarantee', detail: 'Erster Boss ab Stufe 10: Rare mit ≥4 Mods' });
        items.push(rare);
      }
      const uids = items.map((it) => addItem(s, it));
      run.status = 'resolved';
      run.victory = res.victory;
      run.encounters = res.encounters.map(({ items: _items, ...rest }) => rest);
      run.playerSnapshot = player;
      run.rewards = { xp: res.totals.xp, gold: res.totals.gold, materials: res.totals.materials, itemUids: uids };
      if (res.victory) c.dungeonProgress[run.dungeonId] = Math.max(c.dungeonProgress[run.dungeonId] ?? 0, run.monsterLevel);
      s.runHistory.push({ id: run.id, dungeonId: run.dungeonId, monsterLevel: run.monsterLevel, victory: res.victory, encounters: res.encounters.length });
      if (s.runHistory.length > 30) s.runHistory = s.runHistory.slice(-30);
      return res.victory ? 'Sieg!' : 'Niederlage. Keine Ausrüstung verloren.';
    }
    case 'CLAIM_REWARDS': {
      const run = s.activeRun ?? fail('Kein Run vorhanden.');
      if (run.status !== 'resolved') fail('Run ist noch nicht ausgewertet.');
      if (run.claimed) return 'Belohnungen wurden bereits abgeholt.'; // idempotent: no duplicate items
      const r = run.rewards!;
      const before = c.level;
      const lv = applyXp(c.level, c.xp, r.xp);
      c.level = lv.level;
      c.xp = lv.xp;
      c.unspentAttributePoints += lv.levelsGained * B.freeAttributePointsPerLevel;
      run.levelUps = c.level - before;
      s.gold += r.gold;
      addMaterials(s, r.materials);
      const rng = new Rng(seed);
      for (const uid of r.itemUids) {
        const it = s.items[uid]!;
        if (s.lootFilter.autoSalvageNormal && it.rarity === 'normal' && !it.locked && !it.favorite) {
          for (const [m, range] of Object.entries(B.salvage.normal) as [MaterialId, [number, number]][]) s.materials[m] += rng.int(range[0], range[1]);
          delete s.items[uid];
          continue;
        }
        if (s.inventory.length < B.inventorySize) s.inventory.push(uid);
        else s.pendingRewards.push(uid); // never discard
      }
      run.claimed = true;
      // newly unlocked skills are auto-slotted while slots are free
      const cls = CLASS_BY_ID[c.classId]!;
      for (const id of cls.skills) {
        if (c.activeSkills.length >= B.activeSkillSlots) break;
        const sk = SKILL_BY_ID[id]!;
        if (sk.unlockLevel <= c.level && sk.unlockLevel > before && !c.activeSkills.includes(id)) {
          c.activeSkills.push(id);
          c.priority = defaultPriority(c.activeSkills).map((d) => c.priority.find((p) => p.skillId === d.skillId) ?? d);
        }
      }
      return run.levelUps > 0 ? `Stufe ${c.level} erreicht!` : 'Belohnungen erhalten.';
    }
    case 'MOVE_PENDING_TO_INVENTORY': {
      if (s.pendingRewards.length === 0) fail('Keine ausstehenden Belohnungen.');
      while (s.pendingRewards.length && s.inventory.length < B.inventorySize) s.inventory.push(s.pendingRewards.shift()!);
      return undefined;
    }
    case 'SET_LOOT_FILTER': {
      if (!RARITY_ORDER.includes(cmd.filter.minVisibleRarity)) fail('Ungültiger Filter.');
      s.lootFilter = { minVisibleRarity: cmd.filter.minVisibleRarity, autoSalvageNormal: !!cmd.filter.autoSalvageNormal };
      return undefined;
    }
    case 'SAVE_PRESET': {
      const name = cmd.name.trim();
      if (!name || name.length > 24) fail('Ungültiger Preset-Name.');
      s.presets[name] = { name, passives: [...c.passives], activeSkills: [...c.activeSkills], priority: structuredClone(c.priority), equipment: { ...c.equipment } };
      return `Preset „${name}" gespeichert.`;
    }
    case 'LOAD_PRESET': {
      const p = s.presets[cmd.name] ?? fail('Preset existiert nicht.');
      const tree = PASSIVE_TREES[CLASS_BY_ID[c.classId]!.passiveTree] ?? [];
      if (!isConnected(tree, p.passives)) fail('Preset-Talente sind ungültig.');
      const nonRoot = p.passives.filter((x) => !x.endsWith('_root')).length;
      if (nonRoot > talentPointsForLevel(c.level)) fail('Nicht genug Talentpunkte für dieses Preset.');
      // equipment: move currently equipped to inventory, then equip preset items that still exist
      const target = { ...p.equipment };
      for (const slot of EQUIP_SLOTS) {
        const cur = c.equipment[slot];
        if (cur && cur !== target[slot]) { s.inventory.push(cur); c.equipment[slot] = null; }
      }
      for (const slot of EQUIP_SLOTS) {
        const uid = target[slot];
        if (!uid || c.equipment[slot] === uid) continue;
        const loc = locationOf(s, uid);
        if (loc !== 'inventory' && loc !== 'stash') continue; // salvaged or missing: skip
        s.inventory = s.inventory.filter((u) => u !== uid);
        s.stash = s.stash.filter((u) => u !== uid);
        c.equipment[slot] = uid;
      }
      if (s.inventory.length > B.inventorySize) fail('Inventar voll – Preset kann nicht geladen werden.');
      c.passives = [...p.passives];
      c.activeSkills = p.activeSkills.filter((id) => (SKILL_BY_ID[id]?.unlockLevel ?? 99) <= c.level);
      c.priority = p.priority.filter((r) => c.activeSkills.includes(r.skillId));
      return `Preset „${p.name}" geladen.`;
    }
  }
}

function guaranteedWeaponUpgrade(s: GameState, derived: DerivedStats, cfg: RunConfig, runSeed: number): ItemInstance {
  // D-077: magic weapon of the same hand-count, newest unlocked tier, guaranteed offensive prefix (p01/p02)
  const hands = derived.weapon.hands;
  const fam = hands === 2 ? 'greataxe' : 'shortsword';
  const family = s.character && s.items[s.character.equipment.mainhand ?? '']?.baseId.split('_t')[0];
  const famId = family && family !== 'unarmed' ? family : fam;
  const tier = [6, 5, 4, 3, 2, 1].find((t) => B.baseTierMinLevel[t - 1]! <= cfg.monsterLevel) ?? 1;
  const base = getBase(`${famId}_t${tier}`);
  const item = blankItem(base, Math.min(100, cfg.monsterLevel + 1), 'magic', `${cfg.name} · Erstabschluss`);
  const rngs = affixRngs(deriveSeed(runSeed, 'firstClear'), 0);
  const fallback = Rng.fromLabels(runSeed, 'firstClearFam');
  const famPick = fallback.chance(90 / 175) ? 'p01' : 'p02';
  addRandomAffix(item, rngs, { side: 'prefix', extraExcludedGroups: new Set(AFFIXES.filter((a) => a.side === 'prefix' && a.id !== famPick).map((a) => a.groupId)) });
  addRandomAffix(item, rngs, { side: 'suffix' });
  item.history.push({ action: 'guarantee', detail: 'Erster Dungeon-Abschluss: magisches Waffen-Upgrade' });
  return item;
}

export { newGameState };

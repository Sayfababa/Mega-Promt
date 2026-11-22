import fc from 'fast-check';
import { applyCommand, type Command } from '../../engine/state/commands';
import { newGameState, type GameState } from '../../engine/state/gameState';
import { applyCraft, validateCraft, RECIPES } from '../../engine/crafting/recipes';
import { emptyTelemetry, generateItem } from '../../engine/loot/generator';
import { AFFIX_BY_ID } from '../../content/affixes/affixes';
import { DUNGEONS } from '../../content/dungeons/dungeons';
import { getBase } from '../../content/bases/bases';
import { simulateCombat } from '../../engine/combat/simulate';
import { buildFixture } from '../../tooling/fixtures';
import { buildEnemy } from '../../engine/run/run';
import { runConfigFor } from '../../engine/state/commands';
import { EQUIP_SLOTS, MATERIAL_IDS, type ItemInstance } from '../../engine/types';

const crypt = DUNGEONS[1]!;

function itemValid(it: ItemInstance): boolean {
  const base = getBase(it.baseId);
  const caps = { normal: 0, magic: 1, rare: 3, unique: 0 }[it.rarity];
  if (it.prefixes.length > caps || it.suffixes.length > caps) return false;
  const groups = new Set<string>();
  for (const a of [...it.prefixes, ...it.suffixes]) {
    const f = AFFIX_BY_ID[a.familyId];
    if (!f || groups.has(f.groupId)) return false;
    groups.add(f.groupId);
    if (!f.categories.some((c) => base.categories.includes(c))) return false;
    if (a.tier === 1 && it.itemLevel < 80) return false;
    if (a.values.some((v) => !Number.isFinite(v))) return false;
  }
  return [...it.prefixes, ...it.suffixes].filter((a) => a.sealed).length <= 1;
}

describe('property: crafting sequences never produce invalid items', () => {
  it('random recipe sequences on random drops', () => {
    fc.assert(fc.property(
      fc.integer({ min: 0, max: 1e9 }), fc.integer({ min: 1, max: 100 }),
      fc.array(fc.tuple(fc.integer({ min: 0, max: RECIPES.length - 1 }), fc.integer({ min: 0, max: 5 }), fc.integer({ min: 0, max: 1e9 })), { maxLength: 25 }),
      (seed, lvl, steps) => {
        let it = generateItem({ seed, encounterType: 'boss', monsterLevel: lvl, baseWeights: crypt.baseWeights, baseFamilies: crypt.baseFamilies, magicFind: 0, source: 'p' }, 0, emptyTelemetry());
        for (const [r, idx, s] of steps) {
          const recipe = RECIPES[r]!.id;
          const params = { affixIndex: idx, essence: 'power' as const };
          if (validateCraft(it, recipe, params)) continue;
          it = applyCraft(it, recipe, params, s).item;
          if (!itemValid(it)) return false;
        }
        return itemValid(it);
      },
    ), { numRuns: 400 });
  });
});

describe('property: random command streams keep the state consistent', () => {
  const cmdArb: fc.Arbitrary<(s: GameState) => Command> = fc.oneof(
    fc.constant(() => ({ type: 'START_RUN', dungeonId: 'forsaken_gate', monsterLevel: 1 }) as Command),
    fc.constant(() => ({ type: 'RESOLVE_RUN' }) as Command),
    fc.constant(() => ({ type: 'CLAIM_REWARDS' }) as Command),
    fc.integer({ min: 0, max: 80 }).map((i) => (s: GameState) => ({ type: 'EQUIP_ITEM', uid: s.inventory[i % Math.max(1, s.inventory.length)] ?? 'x' }) as Command),
    fc.constantFrom(...EQUIP_SLOTS).map((slot) => () => ({ type: 'UNEQUIP_ITEM', slot }) as Command),
    fc.integer({ min: 0, max: 80 }).map((i) => (s: GameState) => ({ type: 'SALVAGE_ITEMS', uids: s.inventory.slice(0, (i % 3) + 1) }) as Command),
    fc.integer({ min: 0, max: 80 }).map((i) => (s: GameState) => ({ type: 'STASH_ITEM', uid: s.inventory[i % Math.max(1, s.inventory.length)] ?? 'x', to: 'stash' }) as Command),
    fc.tuple(fc.integer({ min: 0, max: 80 }), fc.constantFrom(...RECIPES.map((r) => r.id))).map(([i, recipe]) => (s: GameState) => ({ type: 'CRAFT_ITEM', uid: Object.keys(s.items)[i % Math.max(1, Object.keys(s.items).length)] ?? 'x', recipe, params: { affixIndex: 0, essence: 'life' } }) as Command),
    fc.constantFrom('g_s_hp', 'g_s_phys', 'g_s_armor', 'g_s_regen').map((nodeId) => () => ({ type: 'SET_PASSIVE', nodeId, allocate: true }) as Command),
  );
  it('no item in two places, no negative materials/gold, locations ⊆ items', () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 1e9 }), fc.array(cmdArb, { maxLength: 40 }), (seed, cmds) => {
      let s = applyCommand(newGameState(seed), { type: 'CREATE_CHARACTER', name: 'Prop', classId: 'guardian' }).state;
      for (const mk of cmds) s = applyCommand(s, mk(s)).state;
      const places = [...s.inventory, ...s.stash, ...s.pendingRewards, ...EQUIP_SLOTS.map((x) => s.character!.equipment[x]).filter((x): x is string => !!x)];
      if (new Set(places).size !== places.length) return false;
      if (!places.every((u) => s.items[u])) return false;
      if (s.gold < 0 || MATERIAL_IDS.some((m) => s.materials[m] < 0)) return false;
      if (s.inventory.length > 60) return false;
      return Object.values(s.items).every(itemValid);
    }), { numRuns: 60 });
  });
});

describe('property: combat never yields NaN / negative HP and always terminates', () => {
  it('random seeds against all slice encounters', () => {
    const fx = buildFixture('bleed2h', 8, 'early');
    const cfg = runConfigFor('decayed_crypt', 8);
    fc.assert(fc.property(fc.integer({ min: 0, max: 2 ** 31 }), fc.integer({ min: 0, max: cfg.encounters.length - 1 }), (seed, i) => {
      const r = simulateCombat(fx.player, [buildEnemy(cfg, cfg.encounters[i]!, i)], { seed, record: true });
      return r.durationMs <= 150_000 && r.events.every((e) => (e.v === undefined || Number.isFinite(e.v)) && (e.hp === undefined || e.hp >= 0));
    }), { numRuns: 100 });
  });
});

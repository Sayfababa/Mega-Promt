/**
 * Balance analysis (spec 18). All numbers come from real simulation runs — reports never edit results.
 */
import { B } from '../content/balance';
import { DUNGEON_BY_ID } from '../content/dungeons/dungeons';
import { getBase } from '../content/bases/bases';
import { AFFIX_BY_ID } from '../content/affixes/affixes';
import { simulateCombat } from '../engine/combat/simulate';
import { buildEnemy, encounterSeed, type RunConfig } from '../engine/run/run';
import { riftBossDpsGate, riftConfig, riftDMGmult, riftHPmult } from '../engine/endgame/rifts';
import { emptyTelemetry, expectedDropCount, generateEncounterDrops, generateItem, pAtLeastOneUniqueCandidate, rarityProbabilities } from '../engine/loot/generator';
import { applyCraft, validateCraft, type RecipeId } from '../engine/crafting/recipes';
import { blankItem } from '../engine/loot/generator';
import { applyCommand, derivedFor, equippedItems, runConfigFor, talentPointsAvailable, type Command } from '../engine/state/commands';
import { newGameState, type GameState } from '../engine/state/gameState';
import { xpNext } from '../engine/progression/levels';
import { physicalReduction } from '../engine/stats/mitigation';
import { aggregate, type DerivedStats } from '../engine/stats/aggregate';
import { deriveSeed } from '../engine/core/rng';
import type { BuildFixture } from './fixtures';
import type { EncounterType, EquipSlot, ItemInstance, MaterialId } from '../engine/types';
import { EQUIP_SLOTS } from '../engine/types';

export interface Range { min: number; max: number }
export interface Targets { normalTtk?: Range; eliteTtk?: Range; bossTtk?: Range; dps?: Range; dungeonWin?: number; dungeonWinMax?: number }

export interface EncounterStats {
  index: number;
  monsterId: string;
  type: EncounterType;
  n: number;
  winrate: number;
  ttkP10: number; ttkP50: number; ttkP90: number;   // seconds, victories only
  dps: number;                                      // effective player DPS vs this enemy
  hpAfterPct: number;                               // mean, victories
  dotShare: number;
  oomShare: number;                                 // share of action time where a skill was blocked by mana
  triggersPerFight: number;
  suppressedPerFight: number;
  damageBySource: Record<string, number>;           // share
  defeatCauses: Record<string, number>;
}

export interface ScenarioResult {
  id: string;
  title: string;
  build: string;
  level: number;
  monsterLevel: number;
  budget: string;
  n: number;
  encounters: EncounterStats[];
  dungeonWin: number;
  targets: Targets;
  findings: { level: 'ok' | 'warn'; text: string }[];
}

function pct(arr: number[], p: number): number {
  if (!arr.length) return NaN;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.floor(p * (s.length - 1))))]!;
}

export function runScenario(id: string, title: string, fx: BuildFixture, cfg: RunConfig, n: number, targets: Targets): ScenarioResult {
  const encs = cfg.encounters.map((enc, i) => ({ enc, enemy: buildEnemy(cfg, enc, i) }));
  const acc = encs.map(() => ({ wins: 0, ttk: [] as number[], dealt: 0, time: 0, hpPct: 0, dot: 0, direct: 0, oom: 0, actTime: 0, trig: 0, sup: 0, bySrc: {} as Record<string, number>, causes: {} as Record<string, number> }));
  let dungeonWins = 0;
  for (let s = 0; s < n; s++) {
    const runSeed = deriveSeed(0xdf, id, s);
    let all = true;
    encs.forEach(({ enemy }, i) => {
      const r = simulateCombat(fx.player, [enemy], { seed: encounterSeed(runSeed, i), record: false });
      const a = acc[i]!;
      const dealt = r.metrics.directDamage + r.metrics.dotDamage;
      a.dealt += dealt;
      a.time += r.durationMs;
      a.dot += r.metrics.dotDamage;
      a.direct += r.metrics.directDamage;
      a.oom += r.metrics.oomMs;
      a.actTime += r.durationMs;
      a.trig += r.metrics.triggers;
      a.sup += r.metrics.suppressed;
      for (const [k, v] of Object.entries(r.metrics.damageBySource)) a.bySrc[k] = (a.bySrc[k] ?? 0) + v;
      if (r.outcome === 'victory') {
        a.wins++;
        a.ttk.push(r.durationMs / 1000);
        a.hpPct += r.playerHpEnd / r.playerMaxHp;
      } else {
        all = false;
        const cause = r.outcome === 'timeout' ? 'Timeout' : r.enemyHpEnd < enemy.derived.maxHP * 0.25 ? 'knapp verloren (<25% Gegner-LP)' : 'deutlich unterlegen';
        a.causes[cause] = (a.causes[cause] ?? 0) + 1;
      }
    });
    if (all) dungeonWins++;
  }
  const encounters: EncounterStats[] = encs.map(({ enc }, i) => {
    const a = acc[i]!;
    const totalSrc = Object.values(a.bySrc).reduce((x, y) => x + y, 0) || 1;
    return {
      index: i, monsterId: enc.monsterId, type: enc.type, n,
      winrate: a.wins / n,
      ttkP10: pct(a.ttk, 0.1), ttkP50: pct(a.ttk, 0.5), ttkP90: pct(a.ttk, 0.9),
      dps: a.dealt / (a.time / 1000),
      hpAfterPct: a.wins ? a.hpPct / a.wins : 0,
      dotShare: a.dealt ? a.dot / (a.dot + a.direct) : 0,
      oomShare: a.actTime ? a.oom / a.actTime : 0,
      triggersPerFight: a.trig / n,
      suppressedPerFight: a.sup / n,
      damageBySource: Object.fromEntries(Object.entries(a.bySrc).map(([k, v]) => [k, v / totalSrc])),
      defeatCauses: a.causes,
    };
  });
  const res: ScenarioResult = { id, title, build: fx.name, level: fx.level, monsterLevel: cfg.monsterLevel, budget: fx.budget, n, encounters, dungeonWin: dungeonWins / n, targets, findings: [] };
  res.findings = evaluate(res);
  return res;
}

function inRange(v: number, r: Range): boolean {
  return v >= r.min && v <= r.max;
}

function evaluate(r: ScenarioResult): ScenarioResult['findings'] {
  const f: ScenarioResult['findings'] = [];
  const t = r.targets;
  const check = (label: string, v: number, rg: Range | undefined, unit: string): void => {
    if (!rg) return;
    if (!Number.isFinite(v)) f.push({ level: 'warn', text: `${label}: kein Sieg → keine TTK messbar (Ziel ${rg.min}–${rg.max}${unit})` });
    else if (inRange(v, rg)) f.push({ level: 'ok', text: `${label} ${v.toFixed(1)}${unit} im Ziel ${rg.min}–${rg.max}${unit}` });
    else {
      const low = v < rg.min;
      const word = unit === 's' ? (low ? 'zu schnell' : 'zu langsam') : low ? 'zu niedrig' : 'zu hoch';
      f.push({ level: 'warn', text: `${label} ${v.toFixed(1)}${unit} AUSSERHALB Ziel ${rg.min}–${rg.max}${unit} (${word})` });
    }
  };
  for (const e of r.encounters) {
    const rg = e.type === 'normal' ? t.normalTtk : e.type === 'elite' ? t.eliteTtk : t.bossTtk;
    check(`${e.type} ${e.monsterId} TTK p50`, e.ttkP50, rg, 's');
    if (e.oomShare > 0.2) f.push({ level: 'warn', text: `${e.monsterId}: OOM-Anteil ${(e.oomShare * 100).toFixed(0)}% > 20% (spec 18.1)` });
  }
  const boss = r.encounters.find((e) => e.type === 'boss' || e.type === 'riftboss');
  if (boss) check('DPS vs Boss', boss.dps, t.dps, '');
  if (t.dungeonWin !== undefined) {
    const ok = r.dungeonWin >= t.dungeonWin && (t.dungeonWinMax === undefined || r.dungeonWin <= t.dungeonWinMax);
    f.push({ level: ok ? 'ok' : 'warn', text: `Dungeon-Siegquote ${(r.dungeonWin * 100).toFixed(1)}% (Ziel ≥${(t.dungeonWin * 100).toFixed(0)}%${t.dungeonWinMax !== undefined ? ` und ≤${(t.dungeonWinMax * 100).toFixed(0)}%` : ''})` });
  }
  return f;
}

// --------------------------------------------------------------------- loot KPIs
export function lootReport(n: number): { rows: string[]; uniqueRows: string[]; affixRows: string[]; summary: Record<string, number> } {
  const crypt = DUNGEON_BY_ID.decayed_crypt!;
  const rows = ['encounterType,mf,items,normal,magic,rare,uniqueCandidates,uniqueDrops,failedUniqueRolls,expectedItemsPerEncounter,simItemsPerEncounter,theoreticalUniqueP'];
  const summary: Record<string, number> = {};
  for (const type of ['normal', 'elite', 'boss'] as EncounterType[]) {
    for (const mf of [0, 200]) {
      const tel = emptyTelemetry();
      for (let s = 0; s < n; s++) generateEncounterDrops({ seed: deriveSeed(7, type, mf, s), encounterType: type, monsterLevel: 14, baseWeights: crypt.baseWeights, baseFamilies: crypt.baseFamilies, magicFind: mf, bossId: type === 'boss' ? 'boss_gravelord' : undefined, source: 'sim' }, tel);
      rows.push([type, mf, tel.items, tel.byRarity.normal, tel.byRarity.magic, tel.byRarity.rare, tel.uniqueCandidates, tel.uniqueDrops, tel.failedUniqueRolls, expectedDropCount(type).toFixed(3), (tel.items / n).toFixed(3), rarityProbabilities(type, mf).unique.toFixed(4)].join(','));
      if (type === 'boss') {
        summary[`boss_mf${mf}_candidatesPerKill`] = tel.uniqueCandidates / n;
        summary[`boss_mf${mf}_realUniquesPerKill`] = tel.uniqueDrops / n;
        summary[`boss_mf${mf}_pAtLeastOneCandidateTheory`] = pAtLeastOneUniqueCandidate('boss', mf);
      }
    }
  }
  // per-boss-kill unique outcome with real content pools (Appendix A.3.2)
  const uniqueRows = ['dungeon,boss,kills,uniqueCandidates,realUniques,rareFallbacks,realUniqueRatePerKill'];
  for (const d of [DUNGEON_BY_ID.forsaken_gate!, DUNGEON_BY_ID.decayed_crypt!]) {
    const boss = d.encounters.find((e) => e.type === 'boss')!;
    const tel = emptyTelemetry();
    for (let s = 0; s < n; s++) generateEncounterDrops({ seed: deriveSeed(9, d.id, s), encounterType: 'boss', monsterLevel: d.maxLevel, baseWeights: d.baseWeights, baseFamilies: d.baseFamilies, magicFind: 0, bossId: boss.monsterId, source: 'sim' }, tel);
    uniqueRows.push([d.id, boss.monsterId, n, tel.uniqueCandidates, tel.uniqueDrops, tel.failedUniqueRolls, (tel.uniqueDrops / n).toFixed(5)].join(','));
  }
  // affix distribution per item kind and tier (rares, ilvl 85 to see all tiers)
  const counts = new Map<string, number>();
  for (let s = 0; s < n; s++) {
    const it = generateItem({ seed: deriveSeed(11, s), encounterType: 'boss', monsterLevel: 85, baseWeights: crypt.baseWeights, baseFamilies: crypt.baseFamilies, magicFind: 0, source: 'sim' }, 0, emptyTelemetry(), { forceRarity: 'rare' });
    const kind = getBase(it.baseId).kind;
    for (const a of [...it.prefixes, ...it.suffixes]) {
      const k = `${kind},${a.familyId},${AFFIX_BY_ID[a.familyId]!.side},T${a.tier}`;
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
  }
  const affixRows = ['itemKind,familyId,side,tier,count', ...[...counts.entries()].sort().map(([k, v]) => `${k},${v}`)];
  return { rows, uniqueRows, affixRows, summary };
}

// --------------------------------------------------------------------- crafting costs (Monte Carlo)
export function craftingCostReport(n: number): string[] {
  const rows = ['goal,strategy,trials,successRate,avgFORGE_DUST,avgARCANE_SHARD,avgESSENCE,avgBases,note'];
  const goal = (it: ItemInstance, fam: string): boolean => [...it.prefixes, ...it.suffixes].some((a) => a.familyId === fam);
  const cost = (acc: Partial<Record<MaterialId, number>>, r: RecipeId): void => {
    const c = { imprint: { FORGE_DUST: 4, ARCANE_SHARD: 1 }, enrich: { ARCANE_SHARD: 2 }, elevate: { ARCANE_SHARD: 7, ESSENCE: 1 }, augment: { ESSENCE: 1, ARCANE_SHARD: 3 } }[r as 'imprint'] ?? {};
    for (const [k, v] of Object.entries(c) as [MaterialId, number][]) acc[k] = (acc[k] ?? 0) + v;
  };
  const strategies: { goal: string; fam: string; base: string; ilvl: number }[] = [
    { goal: 'Waffe mit lok. phys. % (p01)', fam: 'p01', base: 'greataxe_t2', ilvl: 14 },
    { goal: 'Ring mit Schattenresistenz (s14)', fam: 's14', base: 'ring_onyx', ilvl: 14 },
    { goal: 'Brust mit flachen LP (p13)', fam: 'p13', base: 'chest_plate_t2', ilvl: 14 },
  ];
  for (const st of strategies) {
    // A: imprint fresh normal bases until the family appears (stop rule: max 200 bases)
    let accA: Partial<Record<MaterialId, number>> = {};
    let basesA = 0, succA = 0;
    // B: imprint → enrich → elevate → augment×(until 4 mods) on one base, new base on failure (max 50)
    let accB: Partial<Record<MaterialId, number>> = {};
    let basesB = 0, succB = 0;
    for (let t = 0; t < n; t++) {
      for (let b = 0; b < 200; b++) {
        basesA++;
        const it = { ...blankItem(getBase(st.base), st.ilvl, 'normal', 'sim'), uid: 'x' };
        cost(accA, 'imprint');
        const out = applyCraft(it, 'imprint', {}, deriveSeed(t, 'A', b)).item;
        if (goal(out, st.fam)) { succA++; break; }
      }
      for (let b = 0; b < 50; b++) {
        basesB++;
        let it: ItemInstance = { ...blankItem(getBase(st.base), st.ilvl, 'normal', 'sim'), uid: 'x' };
        let k = 0;
        for (const r of ['imprint', 'enrich', 'elevate', 'augment'] as RecipeId[]) {
          if (validateCraft(it, r)) continue;
          cost(accB, r);
          it = applyCraft(it, r, {}, deriveSeed(t, 'B', b, k++)).item;
          if (goal(it, st.fam)) break;
        }
        if (goal(it, st.fam)) { succB++; break; }
      }
    }
    const avg = (a: Partial<Record<MaterialId, number>>, k: MaterialId): string => ((a[k] ?? 0) / n).toFixed(2);
    rows.push([st.goal, 'A: Prägen auf neuen Basen', n, (succA / n).toFixed(4), avg(accA, 'FORGE_DUST'), avg(accA, 'ARCANE_SHARD'), avg(accA, 'ESSENCE'), (basesA / n).toFixed(2), 'Stopp: Ziel erreicht oder 200 Basen'].join(','));
    rows.push([st.goal, 'B: Prägen→Anreichern→Selten→Ergänzen', n, (succB / n).toFixed(4), avg(accB, 'FORGE_DUST'), avg(accB, 'ARCANE_SHARD'), avg(accB, 'ESSENCE'), (basesB / n).toFixed(2), 'Stopp: Ziel erreicht oder 50 Basen'].join(','));
  }
  return rows;
}

// --------------------------------------------------------------------- progression bot
/** heuristic power score (bot only — NOT a gameplay value): sqrt(sheet DPS × effective HP) */
export function powerScore(d: DerivedStats, monsterLevel: number): number {
  const w = d.weapon;
  const aps = Math.min(2.5, Math.max(0.4, w.aps * (1 + (d.stats.attackSpeed ?? 0))));
  const physInc = d.incMods.filter((m) => !m.cond && m.tags.every((t) => ['PHYSICAL', 'ATTACK'].includes(t))).reduce((s, m) => s + m.value, 0);
  const elem = Object.values(w.elemental).reduce((s, r) => s + (r.min + r.max) / 2, 0);
  const crit = Math.min(0.55, Math.max(0.05, w.crit + (d.stats.critChance ?? 0)));
  const dps = ((w.min + w.max) / 2 * (1 + physInc) + elem) * aps * (1 + crit * (0.5 + (d.stats.critMulti ?? 0)));
  const armor = d.armorFlat * (1 + (d.stats.incArmor ?? 0));
  const block = Math.min(0.4, d.stats.blockChance ?? 0) * Math.min(0.75, 0.55 + (d.stats.blockPower ?? 0));
  const ehp = d.maxHP / (1 - physicalReduction(armor, monsterLevel)) / (1 - block) * (1 + Math.min(0.75, (d.stats.resShadow ?? 0) + (d.stats.resAll ?? 0)) * 0.3);
  return Math.sqrt(dps * ehp);
}

export interface BotResult {
  reachedLevel: number;
  runs: number;
  combatSeconds: number;
  milestones: Record<string, { runs: number; combatSeconds: number }>;
  defeats: number;
  bossKills: number;
  itemsEquipped: number;
  crafts: number;
}

function dispatch(s: GameState, c: Command): GameState {
  const r = applyCommand(s, c);
  return r.ok ? r.state : s;
}

export function playBot(seed: number, targetLevel: number, maxRuns: number, overheadSecPerEncounter: number): BotResult {
  let s = dispatch(newGameState(seed), { type: 'CREATE_CHARACTER', name: 'Bot', classId: 'guardian' });
  const res: BotResult = { reachedLevel: 1, runs: 0, combatSeconds: 0, milestones: {}, defeats: 0, bossKills: 0, itemsEquipped: 0, crafts: 0 };
  const order = ['g_s_phys', 'g_s_bleed', 'g_m_bleed', 'g_k_bloodcourt', 'g_s_hp', 'g_s_regen', 'g_s_speed', 'g_s_armor', 'g_s_block', 'g_m_shield', 'g_s_res', 'g_k_berserker', 'g_k_ironheart'];
  let lossStreak = 0;
  while (res.runs < maxRuns && s.character!.level < targetLevel) {
    const c = s.character!;
    // pick dungeon: crypt from level 8, otherwise gate; highest allowed level, minus loss streak
    const dId = c.level >= 9 ? 'decayed_crypt' : 'forsaken_gate';
    const d = DUNGEON_BY_ID[dId]!;
    const cleared = c.dungeonProgress[dId] ?? d.minLevel - 1;
    const maxAllowed = Math.min(d.maxLevel, Math.max(d.minLevel, cleared + 1));
    const lvl = Math.max(d.minLevel, Math.min(maxAllowed, c.level + 1) - Math.min(lossStreak, 3));
    s = dispatch(s, { type: 'START_RUN', dungeonId: dId, monsterLevel: lvl });
    s = dispatch(s, { type: 'RESOLVE_RUN' });
    const run = s.activeRun!;
    res.runs++;
    res.combatSeconds += run.encounters.reduce((a, e) => a + e.durationMs / 1000 + overheadSecPerEncounter, 0);
    if (!run.victory) { res.defeats++; lossStreak++; } else lossStreak = 0;
    res.bossKills += run.encounters.filter((e) => e.type === 'boss' && e.outcome === 'victory').length;
    s = dispatch(s, { type: 'CLAIM_REWARDS' });
    // spend points
    const cc = s.character!;
    if (cc.unspentAttributePoints > 0) {
      const half = Math.ceil(cc.unspentAttributePoints / 2);
      s = dispatch(s, { type: 'ALLOCATE_ATTRIBUTE', attr: 'str', amount: half });
      if (s.character!.unspentAttributePoints > 0) s = dispatch(s, { type: 'ALLOCATE_ATTRIBUTE', attr: 'vit', amount: s.character!.unspentAttributePoints });
    }
    for (const node of order) {
      if (talentPointsAvailable(s) < 1) break;
      if (!s.character!.passives.includes(node)) s = dispatch(s, { type: 'SET_PASSIVE', nodeId: node, allocate: true });
    }
    const want = ['g_cleave', 'g_bloodharvest', 'g_armorbreak', 'g_battlefury', 'g_shieldwall'].filter((id) => ({ g_cleave: 1, g_armorbreak: 2, g_shieldwall: 4, g_bloodharvest: 6, g_battlefury: 8 } as Record<string, number>)[id]! <= s.character!.level).slice(0, 4);
    if (want.join() !== s.character!.activeSkills.join()) s = dispatch(s, { type: 'SET_ACTIVE_SKILLS', skills: want });
    // auto-equip by power score
    for (const uid of [...s.inventory]) {
      const it = s.items[uid];
      if (!it) continue;
      const before = powerScore(derivedFor(s), lvl);
      const trial = applyCommand(s, { type: 'EQUIP_ITEM', uid });
      if (trial.ok && powerScore(derivedFor(trial.state), lvl) > before * 1.005) { s = trial.state; res.itemsEquipped++; }
    }
    // simple crafting: imprint the equipped weapon if it is still normal and materials suffice
    const mh = s.character!.equipment.mainhand;
    if (mh && s.items[mh]!.rarity === 'normal') {
      const r = applyCommand(s, { type: 'CRAFT_ITEM', uid: mh, recipe: 'imprint' });
      if (r.ok) { s = r.state; res.crafts++; }
    }
    // salvage everything not equipped (keeps inventory clean)
    const junk = s.inventory.filter((u) => !s.items[u]!.locked && s.items[u]!.rarity !== 'unique');
    if (junk.length) s = dispatch(s, { type: 'SALVAGE_ITEMS', uids: junk });
    const L = s.character!.level;
    for (const m of [5, 8, 10, 12, 15]) if (L >= m && !res.milestones[`L${m}`]) res.milestones[`L${m}`] = { runs: res.runs, combatSeconds: res.combatSeconds };
  }
  res.reachedLevel = s.character!.level;
  void equippedItems; void EQUIP_SLOTS; void aggregate; void runConfigFor; void xpNext;
  return res;
}

export function riftTable(): { tier: number; hp: number; dmg: number; bossHp: number; minDps150: number; minDps90: number }[] {
  return [1, 10, 20, 30, 40, 50].map((t) => ({
    tier: t, hp: riftHPmult(t), dmg: riftDMGmult(t),
    bossHp: riftBossDpsGate(t).bossHp, minDps150: riftBossDpsGate(t).minDps, minDps90: riftBossDpsGate(t, undefined, B.maxCombatMs).minDps,
  }));
}

export { riftConfig, runConfigFor, B, type EquipSlot };

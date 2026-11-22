/**
 * npm run balance — writes reports/ from REAL simulation results (spec 18.3).
 * Env: DF_SEEDS (default 10000) seeds per fixture/encounter, DF_BOTS (default 100) progression bots.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { BALANCE_VERSION } from '../content/balance';
import { DUNGEON_BY_ID } from '../content/dungeons/dungeons';
import { buildFixture } from './fixtures';
import { craftingCostReport, lootReport, playBot, riftConfig, riftTable, runConfigFor, runScenario, type ScenarioResult } from './balance';
import { xpNext } from '../engine/progression/levels';

const N = Number(process.env.DF_SEEDS ?? 10000);
const BOTS = Number(process.env.DF_BOTS ?? 100);
const t0 = Date.now();
const log = (m: string): void => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${m}`);

mkdirSync('reports', { recursive: true });

// ------------------------------------------------------------------ scenarios (targets: spec 18 table)
const START = { normalTtk: { min: 4, max: 8 }, eliteTtk: { min: 10, max: 18 }, bossTtk: { min: 30, max: 55 }, dps: { min: 18, max: 25 }, dungeonWin: 0.9 };
const EARLY = { normalTtk: { min: 4, max: 9 }, eliteTtk: { min: 10, max: 20 }, bossTtk: { min: 30, max: 60 }, dps: { min: 90, max: 150 }, dungeonWin: 0.8 };
const ENDGAME = { normalTtk: { min: 5, max: 11 }, eliteTtk: { min: 12, max: 28 }, bossTtk: { min: 40, max: 85 }, dps: { min: 2000, max: 3500 }, dungeonWin: 0.7 };

const scenarios: ScenarioResult[] = [];
for (const arch of ['bleed2h', 'block1h'] as const) {
  const plan = [
    { id: `start_${arch}`, title: 'Start: Lv1 · Das Verlassene Tor Stufe 1 · Startausrüstung', fx: buildFixture(arch, 1, 'start'), cfg: runConfigFor('forsaken_gate', 1), targets: START },
    { id: `gate7_${arch}`, title: 'Onboarding: Lv7 · Das Verlassene Tor Stufe 7 · magische Items', fx: buildFixture(arch, 7, 'early'), cfg: runConfigFor('forsaken_gate', 7), targets: {} },
    { id: `crypt8_${arch}`, title: 'Krypta-Einstieg: Lv8 · Verfallene Krypta Stufe 8 · Startausrüstung (Meilenstein „zuvor schwierig“)', fx: buildFixture(arch, 8, 'start'), cfg: runConfigFor('decayed_crypt', 8), targets: {} },
    { id: `crypt8g_${arch}`, title: 'Krypta-Einstieg: Lv8 · Verfallene Krypta Stufe 8 · magische Items', fx: buildFixture(arch, 8, 'early'), cfg: runConfigFor('decayed_crypt', 8), targets: {} },
    { id: `early_${arch}`, title: 'Früh: Lv15 · Verfallene Krypta Stufe 14 · magische Items (spec-Ziel „Lv15“)', fx: buildFixture(arch, 15, 'early'), cfg: runConfigFor('decayed_crypt', 14), targets: EARLY },
    { id: `rift1_${arch}`, title: 'Endgame-Einstieg: Lv60 · Rift-Probe T1 (ohne Modifikatoren) · Rares', fx: buildFixture(arch, 60, 'endgame'), cfg: riftConfig(1, []), targets: ENDGAME },
  ];
  for (const p of plan) {
    log(`scenario ${p.id} (${N} seeds × ${p.cfg.encounters.length} encounters)`);
    scenarios.push(runScenario(p.id, p.title, p.fx, p.cfg, N, p.targets));
  }
}

// ------------------------------------------------------------------ builds.csv
const csv = ['scenario,build,level,monsterLevel,encounter,monster,type,n,winrate,ttkP10,ttkP50,ttkP90,dps,hpAfterPct,dotShare,oomShare,triggersPerFight,suppressedPerFight,dungeonWin'];
for (const s of scenarios) for (const e of s.encounters) csv.push([s.id, s.build, s.level, s.monsterLevel, e.index, e.monsterId, e.type, e.n, e.winrate.toFixed(4), e.ttkP10.toFixed(1), e.ttkP50.toFixed(1), e.ttkP90.toFixed(1), e.dps.toFixed(1), e.hpAfterPct.toFixed(3), e.dotShare.toFixed(3), e.oomShare.toFixed(3), e.triggersPerFight.toFixed(2), e.suppressedPerFight.toFixed(2), s.dungeonWin.toFixed(4)].join(','));
writeFileSync('reports/builds.csv', csv.join('\n'));

// ------------------------------------------------------------------ loot
log(`loot KPIs (${N} encounters per type/MF)`);
const loot = lootReport(N);
writeFileSync('reports/drop-distribution.csv', [...loot.rows, '', ...loot.uniqueRows, '', ...loot.affixRows].join('\n'));

log('crafting Monte Carlo');
const craftRows = craftingCostReport(Math.max(500, Math.floor(N / 5)));
writeFileSync('reports/crafting-costs.csv', craftRows.join('\n'));

// ------------------------------------------------------------------ progression
log(`progression bots (${BOTS})`);
const OVERHEAD = 3; // seconds of UI/decision time per encounter (assumption, documented)
const bots = Array.from({ length: BOTS }, (_, i) => playBot(1000 + i, 15, 400, OVERHEAD));
const ms = ['L5', 'L8', 'L10', 'L12', 'L15'];
const median = (a: number[]): number => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)]! : NaN; };
const progression = {
  balanceVersion: BALANCE_VERSION,
  bots: BOTS,
  overheadSecondsPerEncounter: OVERHEAD,
  reachedL15: bots.filter((b) => b.reachedLevel >= 15).length / BOTS,
  milestones: Object.fromEntries(ms.map((m) => {
    const hit = bots.filter((b) => b.milestones[m]);
    return [m, { reachedShare: hit.length / BOTS, medianRuns: median(hit.map((b) => b.milestones[m]!.runs)), medianMinutes: median(hit.map((b) => b.milestones[m]!.combatSeconds / 60)) }];
  })),
  medianDefeats: median(bots.map((b) => b.defeats)),
  medianItemsEquipped: median(bots.map((b) => b.itemsEquipped)),
  medianCrafts: median(bots.map((b) => b.crafts)),
  xpCurve: Array.from({ length: 20 }, (_, i) => ({ level: i + 1, xpNext: xpNext(i + 1) })),
  riftTable: riftTable(),
  lootSummary: loot.summary,
};
writeFileSync('reports/progression.json', JSON.stringify(progression, null, 2));

// ------------------------------------------------------------------ HTML
const esc = (s: string): string => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);
const f1 = (v: number): string => (Number.isFinite(v) ? v.toFixed(1) : '–');
const warnCount = scenarios.reduce((s, x) => s + x.findings.filter((f) => f.level === 'warn').length, 0);
const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>DARKFORGE Balance-Report v${BALANCE_VERSION}</title>
<style>:root{--bg:#121014;--fg:#e8e2d6;--muted:#9a9187;--gold:#c9a24a;--ok:#5fa86b;--warn:#d0703f;--line:#2d2830}
body{background:var(--bg);color:var(--fg);font:14px/1.45 system-ui,sans-serif;margin:0;padding:24px;max-width:1200px}
h1,h2,h3{color:var(--gold);font-weight:600}table{border-collapse:collapse;width:100%;margin:8px 0 16px}td,th{border-bottom:1px solid var(--line);padding:4px 6px;text-align:right}
th{color:var(--muted);font-weight:500}td:first-child,th:first-child{text-align:left}.ok{color:var(--ok)}.warn{color:var(--warn)}.muted{color:var(--muted)}code{color:var(--gold)}</style></head><body>
<h1>DARKFORGE Balance-Report · balanceVersion ${BALANCE_VERSION}</h1>
<p class="muted">Erzeugt ${new Date().toISOString()} · ${N} Seeds je Fixture/Begegnung · ${BOTS} Progressions-Bots · Laufzeit ${((Date.now() - t0) / 1000).toFixed(0)} s. Alle Werte stammen aus der echten Engine; Zielverletzungen sind <span class="warn">Warnungen</span>, keine geschönten Tests.</p>
<p><b>${warnCount} Zielabweichungen</b> in ${scenarios.length} Szenarien. Details und Entscheidungen: <code>BALANCE_CHANGELOG.md</code>, <code>docs/DECISIONS.md</code>.</p>
${scenarios.map((s) => `<h2>${esc(s.title)}</h2><p class="muted">${esc(s.build)} · Spielerstufe ${s.level} · Monsterstufe ${s.monsterLevel} · Itembudget: ${esc(s.budget)} · Dungeon-Siegquote <b>${(s.dungeonWin * 100).toFixed(1)}%</b></p>
<table><tr><th>Begegnung</th><th>Typ</th><th>Sieg</th><th>TTK p10</th><th>p50</th><th>p90</th><th>DPS</th><th>LP danach</th><th>DoT-Anteil</th><th>OOM</th><th>Trigger/Kampf</th><th>Schadensquellen</th></tr>
${s.encounters.map((e) => `<tr><td>${e.monsterId}</td><td>${e.type}</td><td>${(e.winrate * 100).toFixed(1)}%</td><td>${f1(e.ttkP10)}</td><td>${f1(e.ttkP50)}</td><td>${f1(e.ttkP90)}</td><td>${e.dps.toFixed(1)}</td><td>${(e.hpAfterPct * 100).toFixed(0)}%</td><td>${(e.dotShare * 100).toFixed(0)}%</td><td>${(e.oomShare * 100).toFixed(0)}%</td><td>${e.triggersPerFight.toFixed(1)}</td><td class="muted" style="text-align:left">${Object.entries(e.damageBySource).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k} ${(v * 100).toFixed(0)}%`).join(', ')}</td></tr>`).join('')}</table>
<ul>${s.findings.map((f) => `<li class="${f.level}">${esc(f.text)}</li>`).join('')}</ul>`).join('')}
<h2>Rift-Skalierung &amp; Timeout-Gate (Anhang A.3.1)</h2><table><tr><th>Tier</th><th>HP ×</th><th>Schaden ×</th><th>Boss-LP</th><th>min. DPS @150 s</th><th>min. DPS @90 s</th></tr>
${progression.riftTable.map((r) => `<tr><td>${r.tier}</td><td>${r.hp.toFixed(2)}</td><td>${r.dmg.toFixed(2)}</td><td>${Math.round(r.bossHp).toLocaleString('de-DE')}</td><td>${Math.round(r.minDps150).toLocaleString('de-DE')}</td><td>${Math.round(r.minDps90).toLocaleString('de-DE')}</td></tr>`).join('')}</table>
<h2>Loot-KPI</h2><table><tr>${loot.rows[0]!.split(',').map((h) => `<th>${h}</th>`).join('')}</tr>${loot.rows.slice(1).map((r) => `<tr>${r.split(',').map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>
<p>Echte Unique-Rate mit Content-Pools (Kandidat ≠ gültiger Unique):</p><table><tr>${loot.uniqueRows[0]!.split(',').map((h) => `<th>${h}</th>`).join('')}</tr>${loot.uniqueRows.slice(1).map((r) => `<tr>${r.split(',').map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>
<h2>Crafting-Kosten (Monte Carlo)</h2><table><tr>${craftRows[0]!.split(',').map((h) => `<th>${h}</th>`).join('')}</tr>${craftRows.slice(1).map((r) => `<tr>${r.split(',').map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>
<h2>Progression (Bots über echte Commands)</h2><p class="muted">Bot-Politik: höchste erlaubte Stufe ≤ Charakterstufe+1, Krypta ab Lv9, Rückstufung nach Niederlagen, Auto-Ausrüsten per Heuristik (kein Spielwert), Prägen der Hauptwaffe, Rest verwerten. ${OVERHEAD} s UI-Zeit pro Begegnung angenommen.</p>
<table><tr><th>Meilenstein</th><th>erreicht</th><th>Median Runs</th><th>Median Minuten</th></tr>${Object.entries(progression.milestones).map(([k, v]) => `<tr><td>${k}</td><td>${(v.reachedShare * 100).toFixed(0)}%</td><td>${v.medianRuns}</td><td>${f1(v.medianMinutes)}</td></tr>`).join('')}</table>
<p>Median Niederlagen bis Ende: ${progression.medianDefeats} · Median ausgerüstete Upgrades: ${progression.medianItemsEquipped} · Median Crafts: ${progression.medianCrafts}</p>
</body></html>`;
writeFileSync('reports/balance.html', html);
log(`done. ${warnCount} target warnings. Reports in reports/`);
for (const s of scenarios) {
  console.log(`\n== ${s.id}: dungeonWin ${(s.dungeonWin * 100).toFixed(1)}%`);
  for (const e of s.encounters) console.log(`  ${e.type.padEnd(8)} ${e.monsterId.padEnd(16)} win ${(e.winrate * 100).toFixed(1).padStart(5)}%  TTK p50 ${f1(e.ttkP50).padStart(6)}s  DPS ${e.dps.toFixed(1).padStart(8)}  oom ${(e.oomShare * 100).toFixed(0)}%`);
  for (const f of s.findings.filter((x) => x.level === 'warn')) console.log(`  ! ${f.text}`);
}
console.log('\nprogression', JSON.stringify(progression.milestones), 'reachedL15', progression.reachedL15);
void DUNGEON_BY_ID;

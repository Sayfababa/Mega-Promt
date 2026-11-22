import { useMemo, useState } from 'react';
import { B } from '../../content/balance';
import { DUNGEONS } from '../../content/dungeons/dungeons';
import { MONSTER_BY_ID } from '../../content/monsters/monsters';
import { UNIQUES } from '../../content/uniques/uniques';
import { allowedMonsterLevels, derivedFor } from '../../engine/state/commands';
import { encounterGold, encounterXp } from '../../engine/progression/levels';
import { monsterStats } from '../../engine/combat/monsterScaling';
import { expectedDropCount, rarityProbabilities } from '../../engine/loot/generator';
import type { EncounterType } from '../../engine/types';
import { useGame } from '../store/gameStore';
import { GameImage } from '../components/GameImage';
import { ActionButton } from '../components/common';
import { DTYPE_LABEL, ENCOUNTER_LABEL, MATERIAL_LABEL, RARITY_LABEL, RARITY_ORDER, fmt, pct } from '../labels';

export function DungeonScreen() {
  const game = useGame((s) => s.game);
  const dispatch = useGame((s) => s.dispatch);
  const check = useGame((s) => s.check);
  const setScreen = useGame((s) => s.setScreen);
  const c = game.character!;
  const [dungeonId, setDungeonId] = useState(DUNGEONS[0]!.id);
  const d = DUNGEONS.find((x) => x.id === dungeonId)!;
  const range = allowedMonsterLevels(game, d.id);
  const [levels, setLevels] = useState<Record<string, number>>({});
  const level = Math.min(range.max, Math.max(range.min, levels[d.id] ?? range.max));
  const setLevel = (v: number): void => setLevels({ ...levels, [d.id]: Math.min(range.max, Math.max(range.min, v)) });
  const mf = useMemo(() => derivedFor(game).stats.magicFind ?? 0, [game]);
  const startCmd = { type: 'START_RUN' as const, dungeonId: d.id, monsterLevel: level };
  const reason = check(startCmd);
  const openRun = game.activeRun && !game.activeRun.claimed;

  const start = (): void => {
    const r = dispatch(startCmd);
    if (!r.ok) return;
    const r2 = dispatch({ type: 'RESOLVE_RUN' });
    if (r2.ok) setScreen('combat');
  };

  const types = Array.from(new Set(d.encounters.map((e) => e.type))) as EncounterType[];
  const bossIds = d.encounters.filter((e) => e.type === 'boss').map((e) => e.monsterId);
  const maxIlvl = level + Math.max(...types.map((t) => B.ilvlOffset[t][1]));
  const uniques = UNIQUES.filter((u) => u.dropSource === 'world' || bossIds.includes(u.dropSource));
  const totalW = Object.values(d.baseWeights).reduce((a, b) => a + b, 0);

  return (
    <div>
      <div className="screen-head">
        <h1>Dungeons</h1>
        <span className="sub">Wähle Gebiet und Monsterstufe. Jeder Run besteht aus {d.encounters.length} automatisch simulierten Begegnungen.</span>
      </div>
      {openRun && (
        <div className="notice">
          Es gibt einen offenen Run ({game.activeRun!.status === 'resolved' ? 'ausgewertet, Belohnungen nicht abgeholt' : 'gestartet'}).{' '}
          <button onClick={() => setScreen('combat')} data-testid="goto-combat">Zum Kampf</button>
        </div>
      )}
      <div className="cols" style={{ gridTemplateColumns: 'minmax(220px, 0.8fr) minmax(0, 2fr)' }}>
        <section className="panel">
          <h2>Gebiete</h2>
          <div className="dungeon-list">
            {DUNGEONS.map((x) => {
              const r = allowedMonsterLevels(game, x.id);
              return (
                <button key={x.id} className="dungeon-btn" aria-pressed={x.id === dungeonId} onClick={() => setDungeonId(x.id)} data-testid={`dungeon-${x.id}`}>
                  <GameImage icon={x.icon} alt={x.name} category="dungeon" width={96} height={54} flat />
                  <span>
                    <strong>{x.name}</strong><br />
                    <small className="dim">Stufe {x.minLevel}–{x.maxLevel} · frei bis {r.max}</small>
                    {c.level < x.minLevel && <><br /><small className="warn">Empfohlen ab Charakterstufe {x.minLevel}</small></>}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
        <div>
          <section className="panel">
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <GameImage icon={d.background} alt={d.name} category="background" width={240} height={135} />
              <div style={{ flex: 1, minWidth: 220 }}>
                <h2>{d.name}</h2>
                <p>{d.description}</p>
                <p className="dim">{d.keepRewardsOnDefeat ? 'Bei Niederlage bleiben Belohnungen bereits besiegter Begegnungen erhalten.' : 'Belohnungen nur bei vollständigem Sieg.'} Eine Niederlage kostet nie Ausrüstung.</p>
              </div>
            </div>
            <div className="row" style={{ marginTop: '0.6rem' }}>
              <label htmlFor="mlevel">Monsterstufe</label>
              <button className="small" onClick={() => setLevel(level - 1)} disabled={level <= range.min} title={level <= range.min ? 'Minimum erreicht' : 'Stufe senken'} aria-label="Stufe senken">−</button>
              <input id="mlevel" type="number" min={range.min} max={range.max} value={level} onChange={(e) => setLevel(Number(e.target.value))} style={{ width: 70 }} data-testid="monster-level" />
              <button className="small" onClick={() => setLevel(level + 1)} disabled={level >= range.max} title={level >= range.max ? `Stufe ${range.max + 1} wird durch einen Sieg auf Stufe ${range.max} freigeschaltet` : 'Stufe erhöhen'} aria-label="Stufe erhöhen">+</button>
              <small className="dim">erlaubt {range.min}–{range.max}{range.max < d.maxLevel ? ` (Sieg auf ${range.max} schaltet ${range.max + 1} frei)` : ''}</small>
              <span className="spacer" />
              <ActionButton className="primary" reason={reason} onClick={start} testId="start-run">Run starten</ActionButton>
            </div>
          </section>
          <div className="grid-2" style={{ marginTop: '1rem' }}>
            <section className="panel">
              <h3>Gegner</h3>
              {d.encounters.map((e, i) => {
                const m = MONSTER_BY_ID[e.monsterId]!;
                const st = monsterStats(m, level, e.type);
                return (
                  <div key={i} className="enc" data-testid={`enc-${i}`}>
                    <GameImage icon={m.icon} alt={m.name} category={e.type === 'boss' ? 'boss' : 'monster'} size={60} />
                    <div>
                      <strong>{i + 1}. {m.name}</strong> <span className={`rar-tag ${e.type === 'boss' ? 'rar-unique' : 'dim'}`}>{ENCOUNTER_LABEL[e.type]}</span>
                      <div className="dim" style={{ fontSize: '0.86rem' }}>{m.description}</div>
                      <div className="faint" style={{ fontSize: '0.8rem' }}>
                        LP {st.maxHP} · Roh-DPS {fmt(st.rawDps, 1)} · {DTYPE_LABEL[m.damageType]} · Rüstung {st.armor}
                        {Object.entries(m.resist).filter(([, v]) => v).map(([k, v]) => ` · ${DTYPE_LABEL[k as keyof typeof DTYPE_LABEL]}res. ${pct(v!, 0)}`).join('')}
                      </div>
                      {m.abilities.map((a) => <div key={a.id} className="warn" style={{ fontSize: '0.82rem' }}>{a.name}: {a.description}</div>)}
                      <div className="faint" style={{ fontSize: '0.8rem' }}>Belohnung bei Sieg: {encounterXp(level, e.type, c.level)} EP · {encounterGold(level, e.type)} Gold</div>
                    </div>
                  </div>
                );
              })}
            </section>
            <section className="panel" data-testid="drop-profile">
              <h3>Drop-Profil</h3>
              <p className="dim" style={{ fontSize: '0.86rem' }}>Wahrscheinlichkeiten je erzeugtem Gegenstand, Magiefund {pct(mf, 0)} eingerechnet. Itemlevel ≈ Monsterstufe (Boss +{B.ilvlOffset.boss[0]}).</p>
              <table className="data">
                <thead><tr><th>Begegnung</th><th className="r">Ø Items</th>{RARITY_ORDER.map((r) => <th key={r} className="r">{RARITY_LABEL[r]}</th>)}</tr></thead>
                <tbody>
                  {types.map((t) => {
                    const p = rarityProbabilities(t, mf);
                    return (
                      <tr key={t}>
                        <td>{ENCOUNTER_LABEL[t]}</td>
                        <td className="r">{fmt(expectedDropCount(t), 2)}</td>
                        {RARITY_ORDER.map((r) => <td key={r} className={`r rar-${r}`}>{pct(p[r], 1)}</td>)}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <h4 style={{ marginTop: '0.8rem' }}>Basisgruppen</h4>
              <p style={{ fontSize: '0.86rem' }}>{Object.entries(d.baseWeights).map(([g, w]) => `${g === 'weapon' ? 'Waffen' : g === 'armour' ? 'Rüstung' : g === 'jewellery' ? 'Schmuck' : 'Relikte'} ${pct(w / totalW, 0)}`).join(' · ')}</p>
              <h4>Materialien je Sieg</h4>
              <ul style={{ fontSize: '0.86rem', margin: 0, paddingLeft: '1.2rem' }}>
                {types.includes('normal') && <li>Normal: {B.materials.normalDust}× {MATERIAL_LABEL.FORGE_DUST}</li>}
                {types.includes('boss') && <li>Boss: {B.materials.bossEssence}× {MATERIAL_LABEL.ESSENCE}, {B.materials.bossShards}× {MATERIAL_LABEL.ARCANE_SHARD}; Chance {pct(B.materials.bossChaosChance, 0)} {MATERIAL_LABEL.CHAOS_FRAGMENT}, {pct(B.materials.bossSealChance, 0)} {MATERIAL_LABEL.SEAL_STONE}</li>}
              </ul>
              <h4 style={{ marginTop: '0.8rem' }}>Mögliche Uniques</h4>
              <ul style={{ fontSize: '0.86rem', margin: 0, paddingLeft: '1.2rem' }}>
                {uniques.map((u) => (
                  <li key={u.id} className={u.minItemLevel <= maxIlvl ? 'rar-unique' : 'faint'}>
                    {u.name} <small>({u.dropSource === 'world' ? 'Weltdrop' : 'Bossdrop'}, ab ilvl {u.minItemLevel}{u.minItemLevel > maxIlvl ? ' – auf dieser Stufe nicht möglich' : ''})</small>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

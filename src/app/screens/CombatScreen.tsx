import { hasAsset } from '../assets';
import { statusIcon } from '../../content/assets';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DUNGEON_BY_ID } from '../../content/dungeons/dungeons';
import { MONSTER_BY_ID } from '../../content/monsters/monsters';
import { CLASS_BY_ID } from '../../content/classes/classes';
import { allowedMonsterLevels, replayRunEncounter } from '../../engine/state/commands';
import type { RunState } from '../../engine/state/gameState';
import type { MaterialId } from '../../engine/types';
import { useGame } from '../store/gameStore';
import { GameImage } from '../components/GameImage';
import { ActionButton, Bar, MaterialList } from '../components/common';
import { ItemCell, ItemTooltip } from '../components/ItemView';
import { ENCOUNTER_LABEL, RARITY_LABEL } from '../labels';
import { buildPlayback, describe, lastIndexAt, statusName } from '../combatPlayback';
import { itemName } from '../itemView';

type Speed = 1 | 2 | 4;
const HOLD_MS = 900; // real-time pause between encounters

export function CombatScreen() {
  const game = useGame((s) => s.game);
  const dispatch = useGame((s) => s.dispatch);
  const setScreen = useGame((s) => s.setScreen);
  const run = game.activeRun;

  if (!run) {
    return (
      <div>
        <div className="screen-head"><h1>Kampf</h1></div>
        <section className="panel" data-testid="combat-empty">
          <p>Kein aktiver Kampf. Starte einen Run im Dungeon-Bildschirm.</p>
          <button className="primary" onClick={() => setScreen('dungeons')}>Zu den Dungeons</button>
          {game.runHistory.length > 0 && (
            <>
              <h3 style={{ marginTop: '1rem' }}>Letzte Runs</h3>
              <table className="data"><tbody>
                {game.runHistory.slice(-8).reverse().map((h) => (
                  <tr key={h.id}><td>{DUNGEON_BY_ID[h.dungeonId]?.name ?? h.dungeonId}</td><td>Stufe {h.monsterLevel}</td><td className={h.victory ? 'pos' : 'neg'}>{h.victory ? 'Sieg' : 'Niederlage'}</td><td className="r">{h.encounters} Begegnungen</td></tr>
                ))}
              </tbody></table>
            </>
          )}
        </section>
      </div>
    );
  }
  if (run.status === 'started') {
    return (
      <div>
        <div className="screen-head"><h1>Kampf</h1></div>
        <section className="panel">
          <p>Der Run in {DUNGEON_BY_ID[run.dungeonId]?.name} (Stufe {run.monsterLevel}) wurde gestartet, aber noch nicht ausgewertet.</p>
          <button className="primary" onClick={() => dispatch({ type: 'RESOLVE_RUN' })} data-testid="resolve-run">Run auswerten</button>
        </section>
      </div>
    );
  }
  return <ResolvedRun key={run.id} run={run} />;
}

function ResolvedRun({ run }: { run: RunState }) {
  const game = useGame((s) => s.game);
  const dispatch = useGame((s) => s.dispatch);
  const check = useGame((s) => s.check);
  const setScreen = useGame((s) => s.setScreen);
  const animations = useGame((s) => s.animations);
  const c = game.character!;
  const dungeon = DUNGEON_BY_ID[run.dungeonId]!;

  // exact replays of the stored encounters (engine re-simulates from the stored seed + player snapshot)
  const replays = useMemo(() => run.encounters.map((_, i) => replayRunEncounter(run, i)), [run]);
  const playbacks = useMemo(() => replays.map((r) => buildPlayback(r.result.events, run.playerSnapshot?.derived.maxMana ?? 0)), [replays, run.playerSnapshot]);

  const lastEnc = Math.max(0, run.encounters.length - 1);
  const [enc, setEnc] = useState(run.claimed ? lastEnc : 0);
  const [t, setT] = useState(run.claimed ? (playbacks[lastEnc]?.duration ?? 0) : 0);
  const [speed, setSpeed] = useState<Speed>(1);
  const [playing, setPlaying] = useState(!run.claimed);
  const [finished, setFinished] = useState(run.claimed);
  const holdRef = useRef(0);
  const tRef = useRef(t);
  const jump = (encIdx: number, time: number): void => {
    tRef.current = time;
    holdRef.current = 0;
    setEnc(encIdx);
    setT(time);
  };

  // animation loop: advances combat time; renders ONLY recorded events
  useEffect(() => {
    if (!playing || finished) return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number): void => {
      const dt = now - last;
      last = now;
      const pb = playbacks[enc];
      if (!pb) return;
      if (tRef.current >= pb.duration) {
        holdRef.current += dt;
        if (holdRef.current >= HOLD_MS) {
          if (enc + 1 < playbacks.length) jump(enc + 1, 0);
          else {
            setFinished(true);
            setPlaying(false);
          }
          return;
        }
      } else {
        tRef.current = Math.min(pb.duration, tRef.current + dt * speed);
        setT(tRef.current);
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing, finished, enc, speed, playbacks]);

  const skip = (): void => {
    const lastIdx = playbacks.length - 1;
    jump(lastIdx, playbacks[lastIdx]?.duration ?? 0);
    setFinished(true);
    setPlaying(false);
  };
  const replayEncounter = (i: number): void => {
    jump(i, 0);
    setFinished(false);
    setPlaying(true);
  };

  const rep = replays[enc]!;
  const pb = playbacks[enc]!;
  const events = rep.result.events;
  const showT = finished && enc === playbacks.length - 1 ? pb.duration : t;
  const idx = lastIndexAt(events, showT);
  const frame = idx >= 0 ? pb.frames[idx]! : null;
  const encDef = run.encounters[enc]!;
  const monster = MONSTER_BY_ID[encDef.monsterId]!;
  const pMax = pb.maxHp.player ?? run.playerSnapshot?.derived.maxHP ?? 1;
  const eMax = pb.maxHp.enemy0 ?? rep.enemyMaxHp;
  const pHp = frame?.hp.player ?? pMax;
  const eHp = frame?.hp.enemy0 ?? eMax;
  const pBar = frame?.barrier.player ?? 0;
  const eBar = frame?.barrier.enemy0 ?? 0;
  const pMana = frame?.mana.player ?? run.playerSnapshot?.derived.maxMana ?? 0;
  const pManaMax = run.playerSnapshot?.derived.maxMana ?? 0;
  const name = (id: string | undefined): string => (id === 'player' ? c.name : id?.startsWith('enemy') ? rep.enemyName : (id ?? '—'));

  // floating numbers: recorded damage/heal events from the last second of combat time
  const floats = useMemo(() => {
    if (!animations || idx < 0) return [];
    const out: { key: number; text: string; cls: string; left: number; top: number }[] = [];
    for (let i = idx; i >= 0 && out.length < 8; i--) {
      const e = events[i]!;
      if (e.t < showT - 1000 * speed) break;
      const side = e.tgt === 'player' ? 'player' : 'enemy';
      const baseLeft = side === 'player' ? 20 : 80;
      const jitter = ((i * 37) % 21) - 10;
      const top = 30 + ((i * 13) % 20);
      if (e.type === 'DAMAGE') out.push({ key: i, text: `${e.v}`, cls: e.crit ? 'crit' : '', left: baseLeft + jitter, top });
      else if (e.type === 'STATUS_TICK') out.push({ key: i, text: `${e.v}`, cls: 'dot', left: baseLeft + jitter, top });
      else if (e.type === 'HEAL') out.push({ key: i, text: `+${e.v}`, cls: 'heal', left: baseLeft + jitter, top });
      else if (e.type === 'EVADE') out.push({ key: i, text: 'Ausgewichen', cls: 'miss', left: baseLeft + jitter, top });
      else if (e.type === 'BLOCK') out.push({ key: i, text: 'Block', cls: 'block', left: baseLeft + jitter, top: top + 8 });
    }
    return out;
  }, [animations, idx, events, showT, speed]);

  // combat log grouped into rounds of 1 s
  const logRef = useRef<HTMLDivElement>(null);
  const logLines = useMemo(() => {
    const lines: { key: string; round?: number; t?: number; text?: string; cls?: string }[] = [];
    let round = -1;
    const from = Math.max(0, idx - 400);
    for (let i = from; i <= idx; i++) {
      const e = events[i]!;
      const text = describe(e, name);
      if (!text) continue;
      const r = Math.floor(e.t / 1000) + 1;
      if (r !== round) {
        round = r;
        lines.push({ key: `r${r}-${i}`, round: r });
      }
      lines.push({ key: `e${i}`, t: e.t, text, cls: e.type === 'DAMAGE' && e.crit ? 'warn' : e.type === 'VICTORY' ? 'pos' : e.type === 'DEFEAT' || e.type === 'TIMEOUT' ? 'neg' : '' });
    }
    return lines;
  }, [idx, events]);
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logLines.length]);

  const statuses = (id: string) => Object.entries(frame?.statuses[id] ?? {});
  const rewards = run.rewards;
  const claimReason = run.claimed ? 'Belohnungen wurden bereits abgeholt.' : check({ type: 'CLAIM_REWARDS' });
  const range = allowedMonsterLevels(game, run.dungeonId);
  const againLevel = Math.min(range.max, Math.max(range.min, run.monsterLevel + (run.victory ? 1 : 0)));
  const nextReason = !run.claimed ? 'Zuerst Belohnungen abholen.' : check({ type: 'START_RUN', dungeonId: run.dungeonId, monsterLevel: againLevel });

  return (
    <div>
      <div className="screen-head">
        <h1>Kampf</h1>
        <span className="sub">{dungeon.name} · Monsterstufe {run.monsterLevel}</span>
        <span className="spacer" />
        <span className={`verified ${rep.verified ? '' : 'bad'}`} data-testid="verified-badge" title="Replay-Hash der Ereignisse stimmt mit dem gespeicherten Ergebnis überein">
          {rep.verified ? '✔ verifiziert' : '✖ Replay weicht ab'}
        </span>
      </div>

      <div className="enc-steps" aria-label="Begegnungen">
        {run.encounters.map((e, i) => {
          const done = finished || i < enc || (i === enc && t >= (playbacks[i]?.duration ?? 0));
          const cls = i === enc && !finished ? 'cur' : done ? (e.outcome === 'victory' ? 'won' : 'lost') : '';
          return (
            <button key={i} className={`enc-step ${cls}`} onClick={() => replayEncounter(i)} title="Diese Begegnung erneut abspielen" data-testid={`enc-step-${i}`}>
              {i + 1}. {MONSTER_BY_ID[e.monsterId]?.name} · {ENCOUNTER_LABEL[e.type]}{done ? (e.outcome === 'victory' ? ' ✔' : ' ✖') : ''}
            </button>
          );
        })}
        {run.encounters.length < dungeon.encounters.length && <span className="enc-step lost">{dungeon.encounters.length - run.encounters.length} Begegnung(en) nicht erreicht</span>}
      </div>

      <div className="arena" style={{ marginTop: '0.7rem' }} data-testid="arena">
        <div className="bg"><GameImage icon={dungeon.background} alt="" category="background" width={1200} height={400} decorative /></div>
        <div className="fighter player">
          <div className="fname">{c.name}</div>
          <GameImage icon={`${CLASS_BY_ID[c.classId]!.icon}_full`} alt={c.name} category="class" width={120} height={170} className="portrait" />
          <div className="statuses">{statuses('player').map(([s, n]) => <span key={s} className={`status-chip ${s}`}>{hasAsset(statusIcon(s)) && <GameImage icon={statusIcon(s)} alt="" category="skill" size={16} decorative flat />}{statusName(s)}{n > 1 ? ` ×${n}` : ''}</span>)}</div>
          <Bar kind="barrier" value={pBar} max={pMax} label={`Barriere ${pBar}`} animate={animations} />
          <Bar kind="hp" value={pHp} max={pMax} label={`${Math.max(0, Math.round(pHp))} / ${pMax}`} animate={animations} testId="player-hp" />
          <Bar kind="mana" value={pMana} max={pManaMax} label={`Mana ${Math.round(pMana)} / ${pManaMax}`} animate={animations} />
        </div>
        <div className="vs">
          <div className="clock" data-testid="combat-clock">{(showT / 1000).toFixed(1).replace('.', ',')} s</div>
          <div>Runde {Math.floor(showT / 1000) + 1}</div>
          <small className="dim">Begegnung {enc + 1}/{run.encounters.length}</small>
        </div>
        <div className="fighter enemy">
          <div className="fname">{rep.enemyName} <small className="dim">({ENCOUNTER_LABEL[encDef.type]})</small></div>
          <GameImage icon={monster.icon} alt={monster.name} category={encDef.type === 'boss' ? 'boss' : 'monster'} width={140} height={170} className="portrait" />
          <div className="statuses">{statuses('enemy0').map(([s, n]) => <span key={s} className={`status-chip ${s}`}>{hasAsset(statusIcon(s)) && <GameImage icon={statusIcon(s)} alt="" category="skill" size={16} decorative flat />}{statusName(s)}{n > 1 ? ` ×${n}` : ''}</span>)}</div>
          <Bar kind="barrier" value={eBar} max={eMax} label={`Barriere ${eBar}`} animate={animations} />
          <Bar kind="hp" value={eHp} max={eMax} label={`${Math.max(0, Math.round(eHp))} / ${eMax}`} animate={animations} testId="enemy-hp" />
        </div>
        <div className="floats" aria-hidden="true">
          {floats.map((f) => <span key={f.key} className={`float ${f.cls}`} style={{ left: `${f.left}%`, top: `${f.top}%` }}>{f.text}</span>)}
        </div>
      </div>

      <div className="combat-ctrl">
        <button onClick={() => setPlaying(!playing)} disabled={finished} title={finished ? 'Wiedergabe beendet – Begegnung oben anklicken zum erneuten Abspielen' : undefined} data-testid="play-pause">{playing ? 'Pause' : 'Abspielen'}</button>
        {([1, 2, 4] as Speed[]).map((s) => (
          <button key={s} aria-pressed={speed === s} onClick={() => setSpeed(s)} data-testid={`speed-${s}`}>x{s}</button>
        ))}
        <button onClick={skip} disabled={finished} title={finished ? 'Bereits am Ende' : 'Zum Ergebnis springen (vollständiger Replay bleibt prüfbar)'} data-testid="skip">Überspringen</button>
        <span className="spacer" />
        <small className="dim">Dauer {(encDef.durationMs / 1000).toFixed(1).replace('.', ',')} s · Schaden {Math.round(encDef.metrics.directDamage + encDef.metrics.dotDamage)} · erlitten {Math.round(encDef.metrics.damageTaken)} · Krits {encDef.metrics.crits} · Blocks {encDef.metrics.blocks}</small>
      </div>

      <div className="cols" style={{ gridTemplateColumns: 'minmax(0, 1.3fr) minmax(300px, 1fr)' }}>
        <section className="panel">
          <h3>Kampfprotokoll</h3>
          <div className="log" ref={logRef} data-testid="combat-log" aria-live="off">
            {logLines.map((l) => l.round !== undefined
              ? <div key={l.key} className="round">Runde {l.round}</div>
              : <div key={l.key} className={`ev ${l.cls}`}><span className="t">{((l.t ?? 0) / 1000).toFixed(1).replace('.', ',')}s</span><span>{l.text}</span></div>)}
          </div>
        </section>
        <section className="panel" data-testid="rewards-panel">
          {!finished ? (
            <p className="dim">Ergebnis und Belohnungen erscheinen nach dem Kampf (oder mit „Überspringen“).</p>
          ) : (
            <div className="stack">
              <div className={`result-banner ${run.victory ? 'win' : 'loss'}`} data-testid="run-result">{run.victory ? 'SIEG' : 'NIEDERLAGE'}</div>
              {!run.victory && <p className="dim">Keine Ausrüstung verloren. {dungeon.keepRewardsOnDefeat ? 'Belohnungen bereits besiegter Begegnungen bleiben erhalten.' : ''}</p>}
              {rewards && (
                <>
                  <dl className="kv">
                    <dt>Erfahrung</dt><dd data-testid="reward-xp">{rewards.xp}</dd>
                    <dt>Gold</dt><dd data-testid="reward-gold">{rewards.gold}</dd>
                    {run.levelUps ? <><dt>Stufenaufstiege</dt><dd className="pos">+{run.levelUps}</dd></> : null}
                  </dl>
                  <MaterialList materials={rewards.materials} only={Object.keys(rewards.materials) as MaterialId[]} compact />
                  <h4>Gegenstände ({rewards.itemUids.length})</h4>
                  <RewardItems uids={rewards.itemUids} />
                </>
              )}
              <ActionButton className="primary" reason={claimReason} onClick={() => dispatch({ type: 'CLAIM_REWARDS' })} testId="claim-rewards">Belohnungen abholen</ActionButton>
              {run.claimed && (
                <div className="row">
                  <button onClick={() => setScreen('inventory')} data-testid="goto-inventory">Zum Inventar</button>
                  <ActionButton reason={nextReason} onClick={() => { if (dispatch({ type: 'START_RUN', dungeonId: run.dungeonId, monsterLevel: againLevel }).ok) dispatch({ type: 'RESOLVE_RUN' }); }} testId="run-again">
                    Nächster Run (Stufe {againLevel})
                  </ActionButton>
                  <button onClick={() => setScreen('dungeons')}>Dungeons</button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function RewardItems({ uids }: { uids: string[] }) {
  const items = useGame((s) => s.game.items);
  const [sel, setSel] = useState<string | null>(null);
  const present = uids.filter((u) => items[u]);
  if (uids.length === 0) return <p className="faint">Keine Gegenstände.</p>;
  return (
    <div className="stack">
      <div className="item-grid">
        {present.map((u) => <ItemCell key={u} item={items[u]!} selected={sel === u} onSelect={() => setSel(sel === u ? null : u)} testId={`reward-item-${u}`} />)}
      </div>
      {present.length < uids.length && <p className="faint">{uids.length - present.length} automatisch verwertet.</p>}
      <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.86rem' }}>
        {present.map((u) => <li key={u} className={`rar-${items[u]!.rarity}`}>{itemName(items[u]!)} <small>({RARITY_LABEL[items[u]!.rarity]})</small></li>)}
      </ul>
      {sel && items[sel] && <ItemTooltip item={items[sel]!} />}
    </div>
  );
}

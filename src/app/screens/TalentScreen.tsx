import { hasAsset } from '../assets';
import { passiveIcon } from '../../content/assets';
import { GameImage } from '../components/GameImage';
import { useState } from 'react';
import { B } from '../../content/balance';
import { CLASS_BY_ID } from '../../content/classes/classes';
import { PASSIVE_TREES } from '../../content/passives/guardian';
import { talentPointsAvailable } from '../../engine/state/commands';
import { respecPointCost } from '../../engine/progression/levels';
import type { PassiveNode } from '../../engine/types';
import { useGame } from '../store/gameStore';
import { ActionButton, ConfirmDialog } from '../components/common';

const SIZE_LABEL: Record<PassiveNode['size'], string> = { root: 'Startknoten', small: 'Kleiner Knoten', medium: 'Mittlerer Knoten', key: 'Schlüsselknoten' };

/** undirected, de-duplicated edge list */
function edgePairs(tree: PassiveNode[]): [PassiveNode, PassiveNode, string][] {
  const seen = new Set<string>();
  const out: [PassiveNode, PassiveNode, string][] = [];
  for (const n of tree) for (const e of n.edges) {
    const m = tree.find((x) => x.id === e);
    const key = [n.id, e].sort().join('|');
    if (!m || seen.has(key)) continue;
    seen.add(key);
    out.push([n, m, key]);
  }
  return out;
}

export function TalentScreen() {
  const game = useGame((s) => s.game);
  const dispatch = useGame((s) => s.dispatch);
  const check = useGame((s) => s.check);
  const [focus, setFocus] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const c = game.character!;
  const tree = PASSIVE_TREES[CLASS_BY_ID[c.classId]!.passiveTree] ?? [];
  const free = talentPointsAvailable(game);
  const refund = respecPointCost(c.level);
  const resetCost = c.freeResetUsed ? B.respecFullMultiplier * refund : 0;
  const on = new Set(c.passives);
  const node = tree.find((n) => n.id === focus) ?? null;

  const actionFor = (n: PassiveNode): { cmd: { type: 'SET_PASSIVE'; nodeId: string; allocate: boolean }; reason: string | null } => {
    const cmd = { type: 'SET_PASSIVE' as const, nodeId: n.id, allocate: !on.has(n.id) };
    return { cmd, reason: check(cmd) };
  };

  return (
    <div>
      <div className="screen-head">
        <h1>Talente</h1>
        <span className="sub">Freie Punkte: <strong data-testid="talent-points">{free}</strong> · Rückerstattung je Punkt: {refund} Gold · Gold: {game.gold}</span>
      </div>
      <div className="cols" style={{ gridTemplateColumns: 'minmax(0, 1.6fr) minmax(260px, 1fr)' }}>
        <section className="panel">
          <div className="tree" data-testid="talent-tree">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              {edgePairs(tree).map(([n, m, e]) => {
                const lit = on.has(n.id) && on.has(m.id);
                return <line key={e} x1={n.pos.x} y1={n.pos.y} x2={m.pos.x} y2={m.pos.y} className={lit ? 'on' : ''} vectorEffect="non-scaling-stroke" />;
              })}
            </svg>
            {tree.map((n) => {
              const { reason } = actionFor(n);
              const isOn = on.has(n.id);
              const can = !isOn && !reason;
              return (
                <span key={n.id}>
                  <button
                    className={`node ${n.size} ${isOn ? 'on' : ''} ${can ? 'can' : ''}`}
                    style={{ left: `${n.pos.x}%`, top: `${n.pos.y}%` }}
                    aria-pressed={isOn}
                    aria-label={`${n.name} (${SIZE_LABEL[n.size]}): ${n.text}${isOn ? ' – gelernt' : ''}`}
                    title={`${n.name}: ${n.text}`}
                    onClick={() => setFocus(n.id)}
                    onDoubleClick={() => { if (!reason && n.size !== 'root') dispatch(actionFor(n).cmd); }}
                    data-testid={`node-${n.id}`}
                  >
                    {hasAsset(n.icon ?? passiveIcon(n.id))
                      ? <GameImage icon={n.icon ?? passiveIcon(n.id)} alt={n.name} category="passive" size={n.size === 'key' ? 40 : n.size === 'small' ? 26 : 34} decorative flat />
                      : n.size === 'key' ? '✦' : n.size === 'root' ? '◆' : n.size === 'medium' ? '◈' : '•'}
                  </button>
                  <span className="node-label" style={{ left: `${n.pos.x}%`, top: `calc(${n.pos.y}% + ${n.size === 'key' ? 36 : 28}px)` }}>{n.name}</span>
                </span>
              );
            })}
          </div>
          <p className="faint" style={{ marginTop: '0.5rem' }}>Knoten anklicken für Details; Doppelklick lernt/entfernt direkt. Grün umrandet = jetzt lernbar.</p>
        </section>
        <div>
          <section className="panel" data-testid="node-detail">
            {!node ? (
              <p className="dim">Wähle einen Knoten.</p>
            ) : (
              <div className="stack">
                <h2>{node.name}</h2>
                <small className="dim">{SIZE_LABEL[node.size]}{on.has(node.id) ? ' · gelernt' : ''}</small>
                <p>{node.text}</p>
                {node.size !== 'root' && (() => {
                  const { cmd, reason } = actionFor(node);
                  return (
                    <ActionButton className={cmd.allocate ? 'primary' : 'danger'} reason={reason} onClick={() => dispatch(cmd)} testId="node-toggle">
                      {cmd.allocate ? 'Punkt setzen' : `Punkt entfernen (${refund} Gold)`}
                    </ActionButton>
                  );
                })()}
              </div>
            )}
          </section>
          <section className="panel">
            <h3>Gelernte Knoten</h3>
            <ul>
              {tree.filter((n) => on.has(n.id)).map((n) => <li key={n.id}><strong>{n.name}</strong> <small className="dim">– {n.text}</small></li>)}
            </ul>
          </section>
          <section className="panel">
            <h3>Gesamtrücksetzung</h3>
            <p className="dim">Setzt alle Talente und verteilten Attributpunkte zurück. Kosten: <strong data-testid="reset-cost">{resetCost === 0 ? 'kostenlos (erste Rücksetzung)' : `${resetCost} Gold`}</strong></p>
            <ActionButton className="danger" reason={check({ type: 'RESET_BUILD' })} onClick={() => setConfirmReset(true)} testId="reset-build">Build zurücksetzen</ActionButton>
          </section>
        </div>
      </div>
      {confirmReset && (
        <ConfirmDialog
          title="Build zurücksetzen?"
          confirmLabel={resetCost === 0 ? 'Kostenlos zurücksetzen' : `Für ${resetCost} Gold zurücksetzen`}
          danger
          onCancel={() => setConfirmReset(false)}
          onConfirm={() => { dispatch({ type: 'RESET_BUILD' }); setConfirmReset(false); }}
        >
          <p>Alle Talentpunkte und verteilten Attributpunkte werden erstattet.</p>
        </ConfirmDialog>
      )}
    </div>
  );
}

import { useState } from 'react';
import { CLASSES } from '../../content/classes/classes';
import { useGame } from '../store/gameStore';
import { GameImage } from '../components/GameImage';
import { ATTR_LABEL } from '../labels';

/** phase in which each locked class becomes playable (spec 20) */
const CLASS_PHASE: Record<string, string> = {
  arcanist: 'Phase 3', shadowrunner: 'Phase 3', necromancer: 'Phase 5', runesmith: 'Phase 5', inquisitor: 'Phase 5',
};

export function CreateCharacterScreen() {
  const dispatch = useGame((s) => s.dispatch);
  const check = useGame((s) => s.check);
  const [name, setName] = useState('');
  const [classId, setClassId] = useState('guardian');
  const cmd = { type: 'CREATE_CHARACTER', name, classId } as const;
  const reason = name.trim().length === 0 ? 'Bitte einen Namen eingeben (2–20 Zeichen).' : check(cmd);

  return (
    <div className="create" data-testid="screen-create">
      <h1 style={{ fontSize: '2.2rem', letterSpacing: '0.25em', textAlign: 'center' }}>DARK<span style={{ color: 'var(--rust)' }}>FORGE</span></h1>
      <p className="dim" style={{ textAlign: 'center' }}>Ein neuer Held tritt aus der Asche. Wähle Namen und Klasse.</p>
      <form
        className="panel stack"
        onSubmit={(e) => {
          e.preventDefault();
          if (!reason) dispatch(cmd);
        }}
      >
        <label htmlFor="char-name">Name des Helden</label>
        <input id="char-name" type="text" value={name} maxLength={20} onChange={(e) => setName(e.target.value)} autoFocus data-testid="create-name" autoComplete="off" />
        <h3 style={{ marginTop: '0.6rem' }}>Klasse</h3>
        <div className="class-grid" role="radiogroup" aria-label="Klasse">
          {CLASSES.map((c) => {
            const locked = !c.playable;
            return (
              <button
                type="button"
                key={c.id}
                className="class-card"
                role="radio"
                aria-checked={classId === c.id}
                aria-pressed={classId === c.id}
                disabled={locked}
                title={locked ? `${c.name}: noch nicht spielbar (${CLASS_PHASE[c.id] ?? 'später'})` : c.name}
                onClick={() => setClassId(c.id)}
                data-testid={`class-${c.id}`}
              >
                <GameImage icon={c.icon} alt={c.name} category="class" size={72} />
                <strong>{c.name}</strong>
                <small className="dim">
                  {(Object.keys(ATTR_LABEL) as (keyof typeof ATTR_LABEL)[]).map((k) => `${ATTR_LABEL[k].slice(0, 3)} ${c.start[k]}`).join(' · ')}
                </small>
                {locked && <span className="reason">Gesperrt – {CLASS_PHASE[c.id] ?? 'später'}</span>}
              </button>
            );
          })}
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: '0.6rem' }}>
          {reason && <span className="reason" data-testid="create-reason">{reason}</span>}
          <button type="submit" className="primary" disabled={!!reason} data-testid="create-submit">Held erschaffen</button>
        </div>
      </form>
    </div>
  );
}

import { getBase } from '../../content/bases/bases';
import { MONSTER_BY_ID } from '../../content/monsters/monsters';
import { UNIQUES } from '../../content/uniques/uniques';
import { useGame } from '../store/gameStore';
import { GameImage } from '../components/GameImage';

/**
 * Kodex (spec 16): uniques with source and roll ranges. "Im Besitz" is derived from the items that
 * currently exist in the save (the save keeps no unbounded discovery log in the slice).
 */
export function CodexScreen() {
  const items = useGame((s) => s.game.items);
  const owned = new Set(Object.values(items).map((i) => i.uniqueId).filter(Boolean));
  return (
    <div>
      <div className="screen-head">
        <h1>Kodex</h1>
        <span className="sub">Einzigartige Gegenstände: {owned.size} von {UNIQUES.length} im Besitz</span>
      </div>
      <div className="grid-2">
        {UNIQUES.map((u) => {
          const has = owned.has(u.id);
          const src = u.dropSource === 'world' ? 'Weltdrop' : `Boss: ${MONSTER_BY_ID[u.dropSource]?.name ?? 'Endgame-Boss (noch nicht im Spiel)'}`;
          return (
            <section key={u.id} className="panel" data-testid={`codex-${u.id}`} style={{ opacity: has ? 1 : 0.75 }}>
              <div className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
                <GameImage icon={u.icon} alt={u.name} category="unique" size={56} />
                <div>
                  <h3 className="rar-unique" style={{ margin: 0 }}>{u.name}</h3>
                  <small className="dim">{getBase(u.baseId).name} · ab Itemlevel {u.minItemLevel} · {src}</small>
                  <div><span className={`rar-tag ${has ? 'pos' : 'faint'}`}>{has ? 'Im Besitz' : 'Nicht im Besitz'}</span></div>
                </div>
              </div>
              <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.1rem', fontSize: '0.88rem' }}>
                {u.text.map((t, i) => <li key={i}>{t.replace(/\{(\d)\}/g, (_, k: string) => { const r = u.uniqueRolls[Number(k)]; return r ? `${r.min}–${r.max}` : '?'; })}</li>)}
              </ul>
              <small className="faint">Nachteil: {u.tradeoff}</small>
            </section>
          );
        })}
      </div>
    </div>
  );
}

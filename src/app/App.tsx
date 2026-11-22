import { useEffect } from 'react';
import { useGame, type ScreenId } from './store/gameStore';
import { Toasts } from './components/common';
import { talentPointsAvailable } from '../engine/state/commands';
import { CreateCharacterScreen } from './screens/CreateCharacterScreen';
import { CharacterScreen } from './screens/CharacterScreen';
import { InventoryScreen } from './screens/InventoryScreen';
import { TalentScreen } from './screens/TalentScreen';
import { SkillScreen } from './screens/SkillScreen';
import { DungeonScreen } from './screens/DungeonScreen';
import { CombatScreen } from './screens/CombatScreen';
import { ForgeScreen } from './screens/ForgeScreen';
import { CodexScreen } from './screens/CodexScreen';
import { SettingsScreen } from './screens/SettingsScreen';

const NAV: { id: ScreenId; label: string }[] = [
  { id: 'character', label: 'Charakter' },
  { id: 'inventory', label: 'Inventar & Truhe' },
  { id: 'talents', label: 'Talente' },
  { id: 'skills', label: 'Skills' },
  { id: 'dungeons', label: 'Dungeons' },
  { id: 'combat', label: 'Kampf' },
  { id: 'forge', label: 'Schmiede' },
  { id: 'codex', label: 'Kodex' },
  { id: 'settings', label: 'Einstellungen' },
];

/** visible but not yet available areas — disabled with their reason (spec 16 / 20) */
const LOCKED_NAV: { id: string; label: string; reason: string }[] = [
  { id: 'rifts', label: 'Rifts', reason: 'ab Stufe 60 · Phase 4' },
  { id: 'constellations', label: 'Konstellationen', reason: 'ab Stufe 60 · Phase 4' },
  { id: 'buildlab', label: 'Buildlabor', reason: 'Phase 3' },
];

function Screen({ id }: { id: ScreenId }) {
  switch (id) {
    case 'character': return <CharacterScreen />;
    case 'inventory': return <InventoryScreen />;
    case 'talents': return <TalentScreen />;
    case 'skills': return <SkillScreen />;
    case 'dungeons': return <DungeonScreen />;
    case 'combat': return <CombatScreen />;
    case 'forge': return <ForgeScreen />;
    case 'codex': return <CodexScreen />;
    case 'settings': return <SettingsScreen />;
  }
}

const SAVE_TEXT = { idle: 'Nicht gespeichert', saving: 'Speichert …', saved: 'Gespeichert', error: 'Speicherfehler' } as const;

export function App() {
  const phase = useGame((s) => s.phase);
  const game = useGame((s) => s.game);
  const screen = useGame((s) => s.screen);
  const setScreen = useGame((s) => s.setScreen);
  const saveStatus = useGame((s) => s.saveStatus);
  const loadNotice = useGame((s) => s.loadNotice);
  const init = useGame((s) => s.init);

  useEffect(() => {
    void init();
  }, [init]);

  if (phase === 'loading') {
    return <div className="create"><h1>DARKFORGE</h1><p className="dim">Spielstand wird geladen …</p></div>;
  }
  const c = game.character;
  if (!c) {
    return (
      <>
        <CreateCharacterScreen />
        <Toasts />
      </>
    );
  }
  const badges: Partial<Record<ScreenId, number>> = {
    inventory: game.pendingRewards.length,
    talents: Math.max(0, talentPointsAvailable(game)),
    character: c.unspentAttributePoints,
    combat: game.activeRun && !game.activeRun.claimed ? 1 : 0,
  };

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">DARK<span>FORGE</span></div>
        <div className="topstat"><span>Held</span><strong data-testid="top-name">{c.name}</strong></div>
        <div className="topstat"><span>Stufe</span><strong data-testid="top-level">{c.level}</strong></div>
        <div className="topstat"><span>Gold</span><strong data-testid="top-gold" className="num">{game.gold}</strong></div>
        <span className="save-pill" data-status={saveStatus} data-testid="save-status" aria-live="polite">{SAVE_TEXT[saveStatus]}</span>
      </header>
      <nav className="nav" aria-label="Hauptnavigation">
        <h4>Spiel</h4>
        {NAV.map((n) => (
          <button key={n.id} aria-current={screen === n.id ? 'page' : undefined} onClick={() => setScreen(n.id)} data-testid={`nav-${n.id}`}>
            {n.label}
            {(badges[n.id] ?? 0) > 0 && <span className="badge" aria-label={`${badges[n.id]} offen`}>{badges[n.id]}</span>}
          </button>
        ))}
        <h4>Noch gesperrt</h4>
        {LOCKED_NAV.map((n) => (
          <button key={n.id} disabled title={`${n.label}: ${n.reason}`} data-testid={`nav-${n.id}`} aria-describedby={`nav-reason-${n.id}`}>
            {n.label}
            <span className="nav-reason" id={`nav-reason-${n.id}`} data-testid={`nav-${n.id}-reason`}>{n.reason}</span>
          </button>
        ))}
      </nav>
      <main className="main" data-testid={`screen-${screen}`}>
        {loadNotice && <div className="notice" role="alert">{loadNotice}</div>}
        <Screen id={screen} />
      </main>
      <Toasts />
    </div>
  );
}

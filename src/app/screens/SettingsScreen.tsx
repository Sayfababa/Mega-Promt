import { useRef, useState } from 'react';
import { exportSave } from '../../persistence/exportImport';
import { MAX_SNAPSHOTS } from '../../persistence/db';
import { useGame } from '../store/gameStore';
import { ConfirmDialog } from '../components/common';

export function SettingsScreen() {
  const game = useGame((s) => s.game);
  const animations = useGame((s) => s.animations);
  const setAnimations = useGame((s) => s.setAnimations);
  const newGame = useGame((s) => s.newGame);
  const importFromText = useGame((s) => s.importFromText);
  const toast = useGame((s) => s.toast);
  const lastSavedAt = useGame((s) => s.lastSavedAt);
  const snapshotCount = useGame((s) => s.snapshotCount);
  const [confirmNew, setConfirmNew] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const doExport = (): void => {
    try {
      const text = exportSave(game);
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `darkforge-${game.character?.name ?? 'spielstand'}-stufe${game.character?.level ?? 0}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast('success', 'Spielstand exportiert.');
    } catch (e) {
      toast('error', e instanceof Error ? e.message : String(e));
    }
  };

  const onFile = async (f: File | undefined): Promise<void> => {
    if (!f) return;
    const text = await f.text();
    setImportError(await importFromText(text));
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div>
      <div className="screen-head"><h1>Einstellungen</h1></div>
      <div className="grid-2">
        <section className="panel">
          <h2>Darstellung</h2>
          <label className="row" style={{ gap: '0.5rem' }}>
            <input type="checkbox" checked={animations} onChange={(e) => setAnimations(e.target.checked)} data-testid="toggle-animations" />
            Animationen (schwebende Schadenszahlen, Balken-Übergänge)
          </label>
          <p className="faint">Kampfergebnisse hängen nie von Animationen ab; „Überspringen“ zeigt dasselbe Ergebnis.</p>
        </section>
        <section className="panel">
          <h2>Spielstand</h2>
          <dl className="kv">
            <dt>Letzte Speicherung</dt><dd>{lastSavedAt ? new Date(lastSavedAt).toLocaleString('de-DE') : '—'}</dd>
            <dt>Snapshots (Backup-Rotation)</dt><dd>{snapshotCount} / {MAX_SNAPSHOTS}</dd>
            <dt>Schema / Balance / Content</dt><dd>v{game.saveSchemaVersion} / v{game.balanceVersion} / v{game.contentVersion}</dd>
            <dt>Seed</dt><dd className="mono">{game.seed}</dd>
          </dl>
          <p className="faint" style={{ marginTop: '0.5rem' }}>Die Prüfsumme erkennt versehentliche Beschädigung; sie ist kein Manipulationsschutz.</p>
          <div className="row" style={{ marginTop: '0.6rem' }}>
            <button onClick={doExport} data-testid="export-save">Exportieren (JSON)</button>
            <button onClick={() => fileRef.current?.click()} data-testid="import-save">Importieren …</button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" onChange={(e) => void onFile(e.target.files?.[0])} data-testid="import-file" aria-label="Spielstanddatei wählen" />
          </div>
          {importError && <p className="neg" role="alert" data-testid="import-error">{importError}</p>}
        </section>
        <section className="panel">
          <h2>Neues Spiel</h2>
          <p className="dim">Löscht den aktuellen Charakter und alle Snapshots in diesem Browser. Exportiere vorher, wenn du ihn behalten willst.</p>
          <button className="danger" onClick={() => setConfirmNew(true)} data-testid="new-game">Neues Spiel beginnen</button>
        </section>
      </div>
      {confirmNew && (
        <ConfirmDialog
          title="Neues Spiel beginnen?"
          confirmLabel="Alles löschen und neu beginnen"
          danger
          onCancel={() => setConfirmNew(false)}
          onConfirm={() => { setConfirmNew(false); void newGame(); }}
        >
          <p>{game.character ? <>„{game.character.name}“ (Stufe {game.character.level}) und</> : 'Der aktuelle Stand und'} alle gespeicherten Snapshots werden unwiderruflich gelöscht.</p>
        </ConfirmDialog>
      )}
    </div>
  );
}

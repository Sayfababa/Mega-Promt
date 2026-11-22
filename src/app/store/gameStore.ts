/**
 * UI store (Zustand). Holds the GameState; the ONLY way to change it is dispatch(cmd) → applyCommand.
 * After every successful command the new state is autosaved (queued, transactional Dexie commit).
 */
import { create } from 'zustand';
import { applyCommand, type Command, type CommandResult } from '../../engine/state/commands';
import { newGameState, type GameState } from '../../engine/state/gameState';
import { clearSaves, commitSnapshot, getDb, listSnapshots, loadLatest } from '../../persistence/db';
import { importSave } from '../../persistence/exportImport';

export type ScreenId =
  | 'character' | 'inventory' | 'talents' | 'skills' | 'dungeons' | 'combat' | 'forge' | 'codex' | 'settings';

export interface Toast {
  id: number;
  kind: 'info' | 'success' | 'error';
  text: string;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface GameStore {
  phase: 'loading' | 'ready';
  game: GameState;
  screen: ScreenId;
  toasts: Toast[];
  saveStatus: SaveStatus;
  lastSavedAt: number | null;
  snapshotCount: number;
  loadNotice: string | null;
  animations: boolean;
  /** item selected for the forge (set from inventory "In der Schmiede öffnen") */
  forgeItemUid: string | null;

  init(): Promise<void>;
  dispatch(cmd: Command): CommandResult;
  /** dry run: returns the error the command WOULD produce, or null if it is currently allowed */
  check(cmd: Command): string | null;
  setScreen(s: ScreenId): void;
  setForgeItem(uid: string | null): void;
  toast(kind: Toast['kind'], text: string): void;
  dismissToast(id: number): void;
  setAnimations(on: boolean): void;
  newGame(): Promise<void>;
  /** returns null on success, otherwise the (German) rejection reason */
  importFromText(text: string): Promise<string | null>;
}

const ANIM_KEY = 'darkforge.animations';

function readAnimPref(): boolean {
  try {
    return globalThis.localStorage?.getItem(ANIM_KEY) !== 'off';
  } catch {
    return true;
  }
}

/** start seed for a new game: crypto randomness in the app layer (engine stays deterministic); ?seed=N for reproducible tests */
export function freshSeed(): number {
  try {
    const q = new URLSearchParams(globalThis.location?.search ?? '').get('seed');
    if (q && /^\d{1,10}$/.test(q)) return Number(q) >>> 0;
  } catch {
    /* ignore */
  }
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0]! >>> 0;
}

let toastId = 1;
let saveChain: Promise<unknown> = Promise.resolve();

export const useGame = create<GameStore>((set, get) => {
  const persist = (state: GameState): void => {
    set({ saveStatus: 'saving' });
    saveChain = saveChain
      .then(() => commitSnapshot(getDb(), state))
      .then(async () => {
        const metas = await listSnapshots(getDb());
        // only report "saved" if no newer save was queued meanwhile
        if (get().game === state) set({ saveStatus: 'saved', lastSavedAt: Date.now(), snapshotCount: metas.length });
      })
      .catch((e: unknown) => {
        set({ saveStatus: 'error' });
        get().toast('error', `Speichern fehlgeschlagen: ${e instanceof Error ? e.message : String(e)}`);
      });
  };

  return {
    phase: 'loading',
    game: newGameState(0),
    screen: 'character',
    toasts: [],
    saveStatus: 'idle',
    lastSavedAt: null,
    snapshotCount: 0,
    loadNotice: null,
    animations: readAnimPref(),
    forgeItemUid: null,

    async init() {
      try {
        const loaded = await loadLatest(getDb());
        const metas = await listSnapshots(getDb());
        if (loaded) {
          set({
            phase: 'ready', game: loaded.state, lastSavedAt: loaded.record.savedAt, saveStatus: 'saved', snapshotCount: metas.length,
            loadNotice: loaded.skipped > 0 ? `Der neueste Spielstand war beschädigt (${loaded.skippedReasons.join('; ')}). Ein älteres funktionierendes Backup wurde geladen.` : null,
          });
          return;
        }
        set({
          phase: 'ready', game: newGameState(freshSeed()), snapshotCount: metas.length,
          loadNotice: metas.length > 0 ? 'Kein gespeicherter Snapshot war lesbar. Ein neues Spiel wurde begonnen.' : null,
        });
      } catch (e) {
        set({ phase: 'ready', game: newGameState(freshSeed()), loadNotice: `Speicher nicht verfügbar: ${e instanceof Error ? e.message : String(e)}` });
      }
    },

    dispatch(cmd) {
      let r: CommandResult;
      try {
        r = applyCommand(get().game, cmd);
      } catch (e) {
        const msg = `Interner Fehler: ${e instanceof Error ? e.message : String(e)}`;
        get().toast('error', msg);
        return { ok: false, state: get().game, error: msg };
      }
      if (r.ok) {
        set({ game: r.state });
        if (r.message) get().toast('success', r.message);
        persist(r.state);
      } else {
        get().toast('error', r.error);
      }
      return r;
    },

    check(cmd) {
      try {
        const r = applyCommand(get().game, cmd);
        return r.ok ? null : r.error;
      } catch (e) {
        return e instanceof Error ? e.message : String(e);
      }
    },

    setScreen(screen) {
      set({ screen });
    },
    setForgeItem(uid) {
      set({ forgeItemUid: uid });
    },
    toast(kind, text) {
      const id = toastId++;
      set({ toasts: [...get().toasts.slice(-4), { id, kind, text }] });
      setTimeout(() => get().dismissToast(id), kind === 'error' ? 6000 : 3500);
    },
    dismissToast(id) {
      set({ toasts: get().toasts.filter((t) => t.id !== id) });
    },
    setAnimations(on) {
      try {
        globalThis.localStorage?.setItem(ANIM_KEY, on ? 'on' : 'off');
      } catch {
        /* preference just isn't remembered */
      }
      set({ animations: on });
    },
    async newGame() {
      await saveChain;
      await clearSaves(getDb());
      set({ game: newGameState(freshSeed()), screen: 'character', saveStatus: 'idle', lastSavedAt: null, snapshotCount: 0, loadNotice: null, forgeItemUid: null });
    },
    async importFromText(text) {
      const r = importSave(text);
      if (!r.ok) {
        get().toast('error', r.error);
        return r.error;
      }
      set({ game: r.state, screen: 'character', forgeItemUid: null, loadNotice: null });
      persist(r.state);
      get().toast('success', 'Spielstand importiert und geprüft.');
      return null;
    },
  };
});

/** convenience selector hook */
export const useGameState = (): GameState => useGame((s) => s.game);

import type { Session, Snapshot } from './engine';

export const STORAGE_KEY = '2048:v1';
// Read progress saved before the placeholder slug was replaced with the real name.
const LEGACY_STORAGE_KEY = 'game_a:2048:v1';

function isCounter(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isSnapshot(value: unknown): value is Snapshot {
  if (!value || typeof value !== 'object') return false;
  const snapshot = value as Partial<Snapshot>;
  return Array.isArray(snapshot.board) && snapshot.board.length === 16
    && snapshot.board.every((tile: unknown) => isCounter(tile)
      && (tile === 0 || (tile >= 2 && Number.isInteger(Math.log2(tile)))))
    && snapshot.board.filter(Boolean).length >= 2
    && isCounter(snapshot.score) && isCounter(snapshot.moves)
    && typeof snapshot.continued === 'boolean';
}

export function decodeSession(raw: string | null): Session | null {
  try {
    const data: unknown = JSON.parse(raw ?? 'null');
    if (!data || typeof data !== 'object') return null;
    const saved = data as { version?: unknown; current?: unknown; previous?: unknown; best?: unknown };
    if (saved.version !== 1 || !isSnapshot(saved.current) || !isCounter(saved.best)) return null;
    const previous = isSnapshot(saved.previous) ? saved.previous : null;
    return {
      current: saved.current,
      previous,
      best: Math.max(saved.best, saved.current.score, previous?.score ?? 0),
      gain: 0,
    };
  } catch {
    return null;
  }
}

export function loadSession(fallback: () => Session): Session {
  try {
    const current = window.localStorage.getItem(STORAGE_KEY);
    const raw = current === null ? window.localStorage.getItem(LEGACY_STORAGE_KEY) : current;
    return decodeSession(raw) ?? fallback();
  } catch {
    return fallback();
  }
}

export function saveSession(session: Session) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 1, current: session.current, previous: session.previous, best: session.best,
    }));
    return true;
  } catch {
    return false;
  }
}

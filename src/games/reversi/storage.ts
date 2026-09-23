import { legalMoves, type Position, type Session } from './engine';
const KEY = 'reversi:save:v1';
function isPosition(value: unknown): value is Position {
  if (!value || typeof value !== 'object') return false;
  const position = value as Position;
  return Array.isArray(position.board) && position.board.length === 64 && position.board.every((cell) => [0, 1, 2].includes(cell))
    && position.board.filter(Boolean).length >= 4 && [1, 2].includes(position.turn)
    && (position.passed === null || [1, 2].includes(position.passed))
    && (position.last === null || (Number.isInteger(position.last) && position.last >= 0 && position.last < 64));
}
export function decode(raw: string | null): Session | null {
  try {
    const data = JSON.parse(raw ?? 'null');
    if (data?.version !== 1 || !['computer', 'local'].includes(data.mode) || !isPosition(data.current)
      || !Array.isArray(data.history) || data.history.length > 60 || !data.history.every(isPosition)) return null;
    // Normalize a saved turn if only the other color can legally move.
    const current = data.current as Position;
    const other = current.turn === 1 ? 2 : 1;
    return { mode: data.mode, history: data.history, current: !legalMoves(current.board, current.turn).length && legalMoves(current.board, other).length
      ? { ...current, turn: other, passed: current.turn } : current };
  } catch { return null; }
}
export function load(fallback: () => Session): Session {
  try { return decode(localStorage.getItem(KEY)) ?? fallback(); } catch { return fallback(); }
}
export function save(session: Session) {
  try { localStorage.setItem(KEY, JSON.stringify({ version: 1, ...session })); return true; } catch { return false; }
}

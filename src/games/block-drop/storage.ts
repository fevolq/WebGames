import { fits, type BlockState } from './engine';
const KEY = 'block-drop:save:v1';
export interface SavedGame { game: BlockState; best: number }
const counter = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const kind = (value: unknown): value is number => counter(value) && value >= 1 && value <= 7;
export function decode(raw: string | null): SavedGame | null {
  try {
    const data = JSON.parse(raw ?? 'null');
    const game = data?.game as BlockState | undefined;
    if (data?.version !== 1 || !game || !counter(data.best) || !counter(game.score) || !counter(game.lines)
      || !['ready', 'running', 'paused', 'lost'].includes(game.status)
      || !Array.isArray(game.board) || game.board.length !== 200 || !game.board.every((value) => value === 0 || kind(value))
      || !Array.isArray(game.queue) || game.queue.length < 6 || game.queue.length > 14 || !game.queue.every(kind)
      || !game.piece || !kind(game.piece.kind) || !counter(game.piece.rotation) || game.piece.rotation > 3
      || !Number.isInteger(game.piece.x) || game.piece.x < -4 || game.piece.x > 9
      || !Number.isInteger(game.piece.y) || game.piece.y < -4 || game.piece.y >= 20
      || (game.status !== 'lost' && !fits(game.board, game.piece))) return null;
    return { game: { ...game, status: game.status === 'running' ? 'paused' : game.status }, best: Math.max(data.best, game.score) };
  } catch { return null; }
}
export function load(fallback: () => SavedGame): SavedGame {
  try { return decode(localStorage.getItem(KEY)) ?? fallback(); } catch { return fallback(); }
}
export function save(state: SavedGame) {
  try { localStorage.setItem(KEY, JSON.stringify({ version: 1, ...state })); return true; } catch { return false; }
}

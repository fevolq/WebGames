import { DIFFICULTIES, neighbors, type MineState } from './engine';
const KEY = 'minesweeper:save:v1';
export function decode(raw: string | null): MineState | null {
  try {
    const data = JSON.parse(raw ?? 'null');
    const game = data?.game as MineState | undefined;
    if (data?.version !== 1 || !game || !DIFFICULTIES.some(({ size, mines }) => size === game.size && mines === game.mines)
      || !['ready', 'playing', 'won', 'lost'].includes(game.status)
      || !Number.isSafeInteger(game.elapsed) || game.elapsed < 0
      || !Array.isArray(game.board) || game.board.length !== game.size * game.size
      || !game.board.every((value) => Number.isInteger(value) && value >= -1 && value <= 8)
      || !Array.isArray(game.revealed) || game.revealed.length !== game.board.length || !game.revealed.every((value) => typeof value === 'boolean')
      || !Array.isArray(game.flagged) || game.flagged.length !== game.board.length || !game.flagged.every((value) => typeof value === 'boolean')
      || game.flagged.filter(Boolean).length > game.mines
      || (game.exploded !== null && (!Number.isInteger(game.exploded) || game.exploded < 0 || game.exploded >= game.board.length))) return null;
    if (game.status === 'ready') return game.board.every((value) => value === 0) && !game.revealed.some(Boolean) && game.exploded === null ? game : null;
    if (game.board.filter((value) => value === -1).length !== game.mines
      || !game.board.every((value, index) => value === -1 || value === neighbors(index, game.size).filter((near) => game.board[near] === -1).length)
      || (game.status === 'lost' && (game.exploded === null || game.board[game.exploded] !== -1))
      || (game.status !== 'lost' && (game.exploded !== null || game.board.some((value, index) => value === -1 && game.revealed[index])))
      || (game.status === 'won' && !game.board.every((value, index) => value === -1 || game.revealed[index]))) return null;
    return game;
  } catch { return null; }
}
export function load(fallback: () => MineState) {
  try { return decode(localStorage.getItem(KEY)) ?? fallback(); } catch { return fallback(); }
}
export function save(game: MineState) {
  try { localStorage.setItem(KEY, JSON.stringify({ version: 1, game })); return true; } catch { return false; }
}

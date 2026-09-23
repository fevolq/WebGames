export const DIFFICULTIES = [
  { name: '入门', size: 9, mines: 10 },
  { name: '进阶', size: 12, mines: 24 },
  { name: '挑战', size: 16, mines: 40 },
] as const;
export interface MineState {
  size: number; mines: number; board: readonly number[]; revealed: readonly boolean[]; flagged: readonly boolean[];
  status: 'ready' | 'playing' | 'won' | 'lost'; elapsed: number; exploded: number | null;
}
export function createGame(size = 9, mines = 10): MineState {
  return { size, mines, board: Array<number>(size * size).fill(0), revealed: Array<boolean>(size * size).fill(false),
    flagged: Array<boolean>(size * size).fill(false), status: 'ready', elapsed: 0, exploded: null };
}
export function neighbors(index: number, size: number) {
  const result: number[] = [];
  const x = index % size;
  const y = Math.floor(index / size);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if ((dx || dy) && x + dx >= 0 && x + dx < size && y + dy >= 0 && y + dy < size) result.push((y + dy) * size + x + dx);
  }
  return result;
}
export function placeMines(size: number, mines: number, first: number, seed: number) {
  const safe = new Set([first, ...neighbors(first, size)]);
  const candidates = Array.from({ length: size * size }, (_, index) => index).filter((index) => !safe.has(index));
  let random = seed >>> 0 || 1;
  for (let index = candidates.length - 1; index > 0; index--) {
    random ^= random << 13; random ^= random >>> 17; random ^= random << 5;
    const other = Math.floor((random >>> 0) / 4294967296 * (index + 1));
    [candidates[index], candidates[other]] = [candidates[other], candidates[index]];
  }
  const board = Array<number>(size * size).fill(0);
  candidates.slice(0, mines).forEach((index) => { board[index] = -1; });
  return board.map((value, index) => value === -1 ? -1 : neighbors(index, size).filter((near) => board[near] === -1).length);
}
export function flag(state: MineState, index: number): MineState {
  if (['won', 'lost'].includes(state.status) || state.revealed[index]
    || (!state.flagged[index] && state.flagged.filter(Boolean).length >= state.mines)) return state;
  const flagged = [...state.flagged]; flagged[index] = !flagged[index];
  return { ...state, flagged };
}
export function reveal(state: MineState, index: number, seed: number): MineState {
  if (['won', 'lost'].includes(state.status) || state.flagged[index]) return state;
  const board = state.status === 'ready' ? placeMines(state.size, state.mines, index, seed) : state.board;
  let pending = [index];
  if (state.revealed[index]) {
    const near = neighbors(index, state.size);
    if (board[index] <= 0 || near.filter((cell) => state.flagged[cell]).length !== board[index]) return state;
    pending = near.filter((cell) => !state.flagged[cell] && !state.revealed[cell]);
    if (!pending.length) return state;
  }
  const revealed = [...state.revealed];
  while (pending.length) {
    const cell = pending.pop()!;
    if (revealed[cell] || state.flagged[cell]) continue;
    revealed[cell] = true;
    if (board[cell] === -1) return { ...state, board, revealed, status: 'lost', exploded: cell };
    if (board[cell] === 0) pending.push(...neighbors(cell, state.size).filter((near) => !revealed[near] && !state.flagged[near]));
  }
  const won = board.every((value, cell) => value === -1 || revealed[cell]);
  return { ...state, board, revealed, status: won ? 'won' : 'playing', flagged: won ? board.map((value) => value === -1) : state.flagged };
}

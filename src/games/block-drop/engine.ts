export const WIDTH = 10;
export const HEIGHT = 20;
export type Kind = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export interface Piece { kind: Kind; rotation: number; x: number; y: number }
export interface BlockState {
  board: readonly number[]; piece: Piece; queue: readonly Kind[]; score: number; lines: number;
  status: 'ready' | 'running' | 'paused' | 'lost';
}
const shapes: Record<Kind, number[][]> = {
  1: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
  2: [[1, 1], [1, 1]],
  3: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
  4: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
  5: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
  6: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
  7: [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
};
export function cells(piece: Piece): readonly (readonly [number, number])[] {
  let shape = shapes[piece.kind];
  for (let rotation = 0; rotation < piece.rotation; rotation++) shape = shape[0].map((_, x) => shape.map((row) => row[x]).reverse());
  return shape.flatMap((row, y) => row.flatMap((value, x) => value ? [[x + piece.x, y + piece.y] as const] : []));
}
export function shuffledBag(random: () => number): Kind[] {
  const bag: Kind[] = [1, 2, 3, 4, 5, 6, 7];
  for (let index = bag.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [bag[index], bag[other]] = [bag[other], bag[index]];
  }
  return bag;
}
export const level = (state: Pick<BlockState, 'lines'>) => Math.floor(state.lines / 10) + 1;
export const newPiece = (kind: Kind): Piece => ({ kind, rotation: 0, x: kind === 2 ? 4 : 3, y: 0 });
export function createGame(bag: readonly Kind[]): BlockState {
  return { board: Array<number>(WIDTH * HEIGHT).fill(0), piece: newPiece(bag[0]), queue: bag.slice(1), score: 0, lines: 0, status: 'ready' };
}
export function fits(board: readonly number[], piece: Piece) {
  return cells(piece).every(([x, y]) => x >= 0 && x < WIDTH && y < HEIGHT && (y < 0 || board[y * WIDTH + x] === 0));
}
export function shift(state: BlockState, dx: number): BlockState {
  if (state.status !== 'running') return state;
  const piece = { ...state.piece, x: state.piece.x + dx };
  return fits(state.board, piece) ? { ...state, piece } : state;
}
export function rotate(state: BlockState, direction = 1): BlockState {
  if (state.status !== 'running' || state.piece.kind === 2) return state;
  const rotation = (state.piece.rotation + direction + 4) % 4;
  for (const dy of [0, -1, -2]) {
    for (const dx of [0, -1, 1, -2, 2]) {
      const piece = { ...state.piece, rotation, x: state.piece.x + dx, y: state.piece.y + dy };
      if (fits(state.board, piece)) return { ...state, piece };
    }
  }
  return state;
}
export function landing(state: BlockState) {
  let piece = state.piece;
  while (fits(state.board, { ...piece, y: piece.y + 1 })) piece = { ...piece, y: piece.y + 1 };
  return piece;
}
export function clearRows(board: readonly number[]) {
  const rows = Array.from({ length: HEIGHT }, (_, y) => board.slice(y * WIDTH, (y + 1) * WIDTH));
  const remaining = rows.filter((row) => row.some((cell) => cell === 0));
  const cleared = HEIGHT - remaining.length;
  return { board: [...Array<number>(cleared * WIDTH).fill(0), ...remaining.flat()], cleared };
}
function lock(state: BlockState, bag: readonly Kind[]): BlockState {
  if (cells(state.piece).some(([, y]) => y < 0)) return { ...state, status: 'lost' };
  const board = [...state.board];
  for (const [x, y] of cells(state.piece)) board[y * WIDTH + x] = state.piece.kind;
  const result = clearRows(board);
  const queue = state.queue.length <= 7 ? [...state.queue, ...bag] : [...state.queue];
  const piece = newPiece(queue.shift()!);
  return { ...state, board: result.board, piece, queue, lines: state.lines + result.cleared,
    score: state.score + [0, 100, 300, 500, 800][result.cleared] * level(state),
    status: fits(result.board, piece) ? 'running' : 'lost' };
}
export function descend(state: BlockState, bag: readonly Kind[], soft = false): BlockState {
  if (state.status !== 'running') return state;
  const piece = { ...state.piece, y: state.piece.y + 1 };
  return fits(state.board, piece) ? { ...state, piece, score: state.score + (soft ? 1 : 0) } : lock(state, bag);
}
export function hardDrop(state: BlockState, bag: readonly Kind[]): BlockState {
  if (state.status !== 'running') return state;
  const piece = landing(state);
  return lock({ ...state, piece, score: state.score + (piece.y - state.piece.y) * 2 }, bag);
}

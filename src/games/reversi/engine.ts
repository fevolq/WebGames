export type Player = 1 | 2;
export interface Position { board: readonly number[]; turn: Player; passed: Player | null; last: number | null }
export interface Session { current: Position; history: readonly Position[]; mode: 'computer' | 'local' }
export const opponent = (player: Player): Player => player === 1 ? 2 : 1;
export function initial(): Position {
  const board = Array<number>(64).fill(0);
  board[27] = board[36] = 2; board[28] = board[35] = 1;
  return { board, turn: 1, passed: null, last: null };
}
export function flips(board: readonly number[], index: number, player: Player) {
  if (board[index] !== 0) return [];
  const result: number[] = [];
  const x = index % 8;
  const y = Math.floor(index / 8);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (!dx && !dy) continue;
    let column = x + dx; let row = y + dy;
    const line: number[] = [];
    while (column >= 0 && column < 8 && row >= 0 && row < 8 && board[row * 8 + column] === opponent(player)) {
      line.push(row * 8 + column); column += dx; row += dy;
    }
    if (line.length && column >= 0 && column < 8 && row >= 0 && row < 8 && board[row * 8 + column] === player) result.push(...line);
  }
  return result;
}
export function legalMoves(board: readonly number[], player: Player) {
  return board.flatMap((value, index) => value === 0 && flips(board, index, player).length ? [index] : []);
}
export const counts = (board: readonly number[]) => ({ black: board.filter((value) => value === 1).length, white: board.filter((value) => value === 2).length });
export function finished(board: readonly number[]) { return !legalMoves(board, 1).length && !legalMoves(board, 2).length; }
export function place(position: Position, index: number): Position {
  const captured = flips(position.board, index, position.turn);
  if (!captured.length) return position;
  const board = [...position.board];
  for (const cell of [index, ...captured]) board[cell] = position.turn;
  const next = opponent(position.turn);
  if (legalMoves(board, next).length) return { board, turn: next, passed: null, last: index };
  return { board, turn: position.turn, passed: finished(board) ? null : next, last: index };
}
export function play(session: Session, index: number): Session {
  const current = place(session.current, index);
  return current === session.current ? session : { ...session, current, history: [...session.history, session.current] };
}
export function undo(session: Session): Session {
  let index = session.history.length - 1;
  if (session.mode === 'computer') while (index >= 0 && session.history[index].turn !== 1) index--;
  return index >= 0 ? { ...session, current: session.history[index], history: session.history.slice(0, index) } : session;
}
const weights = [
  120, -25, 20, 5, 5, 20, -25, 120,
  -25, -45, -5, -5, -5, -5, -45, -25,
  20, -5, 12, 3, 3, 12, -5, 20,
  5, -5, 3, 3, 3, 3, -5, 5,
  5, -5, 3, 3, 3, 3, -5, 5,
  20, -5, 12, 3, 3, 12, -5, 20,
  -25, -45, -5, -5, -5, -5, -45, -25,
  120, -25, 20, 5, 5, 20, -25, 120,
];
export function chooseMove(position: Position): number | null {
  let chosen: number | null = null;
  let best = -Infinity;
  const late = position.board.filter(Boolean).length > 50;
  for (const index of legalMoves(position.board, position.turn)) {
    const next = place(position, index);
    const score = weights[index] + flips(position.board, index, position.turn).length * (late ? 6 : 1)
      - legalMoves(next.board, opponent(position.turn)).length * 3;
    if (score > best) { best = score; chosen = index; }
  }
  return chosen;
}

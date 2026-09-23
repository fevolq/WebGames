export const SIZE = 4;
export const TARGET = 2048;
export type Direction = 'up' | 'right' | 'down' | 'left';
export type Board = readonly number[];
export type Rolls = readonly [number, number];

export interface Snapshot {
  board: Board;
  score: number;
  moves: number;
  continued: boolean;
}

export interface Session {
  current: Snapshot;
  previous: Snapshot | null;
  best: number;
  gain: number;
}

export type Action =
  | { type: 'move'; direction: Direction; rolls: Rolls }
  | { type: 'undo' }
  | { type: 'continue' }
  | { type: 'restart'; board: Board };

// Read each line from its leading edge so the same merge rule serves all directions.
function lineIndices(line: number, direction: Direction) {
  return Array.from({ length: SIZE }, (_, offset) => {
    switch (direction) {
      case 'left': return line * SIZE + offset;
      case 'right': return line * SIZE + SIZE - 1 - offset;
      case 'up': return offset * SIZE + line;
      case 'down': return (SIZE - 1 - offset) * SIZE + line;
    }
  });
}

export function moveBoard(board: Board, direction: Direction) {
  const next = [...board];
  let gain = 0;
  for (let line = 0; line < SIZE; line++) {
    const indices = lineIndices(line, direction);
    const values = indices.map((index) => board[index]).filter(Boolean);
    const merged: number[] = [];
    for (let index = 0; index < values.length; index++) {
      if (values[index] === values[index + 1]) {
        const value = values[index] * 2;
        merged.push(value);
        gain += value;
        index++;
      } else {
        merged.push(values[index]);
      }
    }
    indices.forEach((index, offset) => { next[index] = merged[offset] ?? 0; });
  }
  return { board: next, gain, changed: next.some((value, index) => value !== board[index]) };
}

// Random values are supplied by the caller, keeping moves and reducers deterministic.
export function spawnTile(board: Board, [position, value]: Rolls): Board {
  const empty = board.flatMap((tile, index) => tile === 0 ? [index] : []);
  if (!empty.length) return board;
  const next = [...board];
  next[empty[Math.floor(position * empty.length)]] = value < 0.9 ? 2 : 4;
  return next;
}

export function createBoard(first: Rolls, second: Rolls): Board {
  return spawnTile(spawnTile(Array<number>(SIZE * SIZE).fill(0), first), second);
}

export function canMove(board: Board) {
  return board.some((value, index) => value === 0
    || (index % SIZE < SIZE - 1 && value === board[index + 1])
    || (index < SIZE * (SIZE - 1) && value === board[index + SIZE]));
}

export function gameStatus({ board, continued }: Snapshot): 'playing' | 'won' | 'lost' {
  if (!continued && board.some((value) => value >= TARGET)) return 'won';
  return canMove(board) ? 'playing' : 'lost';
}

export function createSession(board: Board, best = 0): Session {
  return { current: { board, score: 0, moves: 0, continued: false }, previous: null, best, gain: 0 };
}

export function gameReducer(session: Session, action: Action): Session {
  switch (action.type) {
    case 'move': {
      if (gameStatus(session.current) !== 'playing') return session;
      const moved = moveBoard(session.current.board, action.direction);
      if (!moved.changed) return session;
      const current = {
        ...session.current,
        board: spawnTile(moved.board, action.rolls),
        score: session.current.score + moved.gain,
        moves: session.current.moves + 1,
      };
      return { current, previous: session.current, best: Math.max(session.best, current.score), gain: moved.gain };
    }
    case 'undo':
      return session.previous ? { ...session, current: session.previous, previous: null, gain: 0 } : session;
    case 'continue':
      return gameStatus(session.current) === 'won'
        ? { ...session, current: { ...session.current, continued: true }, gain: 0 } : session;
    case 'restart':
      return createSession(action.board, session.best);
  }
}

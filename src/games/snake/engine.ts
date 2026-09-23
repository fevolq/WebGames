export const SIZE = 20;
export type Direction = 'up' | 'right' | 'down' | 'left';
export type Status = 'ready' | 'running' | 'paused' | 'lost' | 'won';
export interface SnakeState {
  snake: readonly number[]; direction: Direction; queued: Direction | null;
  food: number | null; score: number; status: Status;
}
const opposite: Record<Direction, Direction> = { up: 'down', down: 'up', left: 'right', right: 'left' };
const delta: Record<Direction, readonly [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

export function foodPosition(snake: readonly number[], random: number) {
  const free = Array.from({ length: SIZE * SIZE }, (_, index) => index).filter((index) => !snake.includes(index));
  return free.length ? free[Math.floor(random * free.length)] : null;
}

export function createGame(random: number): SnakeState {
  const snake = [210, 209, 208];
  return { snake, direction: 'right', queued: null, food: foodPosition(snake, random), score: 0, status: 'ready' };
}

export function turn(state: SnakeState, direction: Direction): SnakeState {
  if (state.status !== 'running' || state.queued || direction === state.direction || direction === opposite[state.direction]) return state;
  return { ...state, queued: direction };
}

export function tick(state: SnakeState, random: number): SnakeState {
  if (state.status !== 'running') return state;
  const direction = state.queued ?? state.direction;
  const [dx, dy] = delta[direction];
  const x = state.snake[0] % SIZE + dx;
  const y = Math.floor(state.snake[0] / SIZE) + dy;
  const head = y * SIZE + x;
  const eating = head === state.food;
  // Moving into the departing tail is legal on a step without growth.
  const body = eating ? state.snake : state.snake.slice(0, -1);
  if (x < 0 || x >= SIZE || y < 0 || y >= SIZE || body.includes(head)) return { ...state, status: 'lost', queued: null };
  const snake = [head, ...body];
  const food = eating ? foodPosition(snake, random) : state.food;
  return { snake, food, direction, queued: null, score: state.score + (eating ? 10 : 0), status: food === null ? 'won' : 'running' };
}

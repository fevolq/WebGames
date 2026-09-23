export const FINISH = 60;
export interface Entity { id: number; lane: number; y: number; kind: 'rock' | 'star' }
export interface SpaceState {
  status: 'ready' | 'running' | 'paused' | 'lost' | 'won';
  lane: number; elapsed: number; lives: number; stars: number; entities: readonly Entity[];
  spawnIn: number; invulnerable: number; nextId: number;
}
export function createGame(): SpaceState {
  return { status: 'ready', lane: 1, elapsed: 0, lives: 3, stars: 0, entities: [], spawnIn: .4, invulnerable: 0, nextId: 0 };
}
export function score(state: SpaceState) { return Math.floor(state.elapsed * 10) + state.stars * 50; }
export function steer(state: SpaceState, delta: number): SpaceState {
  return state.status === 'running' ? { ...state, lane: Math.max(0, Math.min(2, state.lane + delta)) } : state;
}
export function tick(state: SpaceState, dt: number, rolls: readonly [number, number]): SpaceState {
  if (state.status !== 'running') return state;
  const elapsed = Math.min(FINISH, state.elapsed + dt);
  let lives = state.lives;
  let stars = state.stars;
  let invulnerable = Math.max(0, state.invulnerable - dt);
  const entities: Entity[] = [];
  for (const entity of state.entities) {
    const y = entity.y + dt * (24 + state.elapsed * .38);
    // Check the swept interval so a slow frame cannot tunnel through the ship.
    const hit = entity.lane === state.lane && entity.y <= 89 && y >= 78;
    if (hit) {
      if (entity.kind === 'star') stars++;
      else if (invulnerable <= 0) { lives--; invulnerable = 1.4; }
    } else if (y < 108) entities.push({ ...entity, y });
  }
  let spawnIn = state.spawnIn - dt;
  let nextId = state.nextId;
  if (spawnIn <= 0) {
    entities.push({ id: nextId++, lane: Math.floor(rolls[0] * 3), y: -8, kind: rolls[1] < .27 ? 'star' : 'rock' });
    spawnIn = Math.max(.42, .88 - elapsed * .006);
  }
  return { ...state, elapsed, entities, lives, stars, invulnerable, spawnIn, nextId,
    status: lives <= 0 ? 'lost' : elapsed >= FINISH ? 'won' : 'running' };
}

import { describe, expect, it } from 'vitest';
import { createGame, score, steer, tick, type SpaceState } from './engine';
const running = (): SpaceState => ({ ...createGame(), status: 'running', spawnIn: 2 });
describe('space flight', () => {
  it('keeps the ship in its three lanes', () => {
    expect(steer(steer(running(), -1), -1).lane).toBe(0);
    expect(steer(steer(running(), 1), 1).lane).toBe(2);
  });
  it('detects swept collisions and only removes one shield during invulnerability', () => {
    const game = { ...running(), entities: [
      { id: 0, lane: 1, y: 70, kind: 'rock' as const },
      { id: 1, lane: 1, y: 75, kind: 'rock' as const },
    ] };
    const next = tick(game, 1, [0, .8]);
    expect(next.lives).toBe(2);
    expect(next.entities).toHaveLength(0);
    expect(next.invulnerable).toBeGreaterThan(0);
  });
  it('collects stars, ignores other lanes and removes objects that leave the screen', () => {
    const next = tick({ ...running(), entities: [
      { id: 0, lane: 1, y: 77, kind: 'star' }, { id: 1, lane: 0, y: 77, kind: 'rock' }, { id: 2, lane: 2, y: 107, kind: 'star' },
    ] }, .1, [0, 0]);
    expect(next.stars).toBe(1);
    expect(next.lives).toBe(3);
    expect(next.entities).toHaveLength(1);
    expect(score(next)).toBe(51);
  });
  it('ends after shield depletion or the 60-second finish and freezes while paused', () => {
    expect(tick({ ...running(), lives: 1, entities: [{ id: 0, lane: 1, y: 78, kind: 'rock' }] }, .05, [0, 0]).status).toBe('lost');
    expect(tick({ ...running(), elapsed: 59.99 }, .05, [0, 0]).status).toBe('won');
    const paused = { ...running(), status: 'paused' as const };
    expect(tick(paused, 1, [0, 0])).toBe(paused);
  });
});

import { describe, expect, it } from 'vitest';
import { createGame, foodPosition, tick, turn, type SnakeState } from './engine';
const running = (): SnakeState => ({ ...createGame(.1), status: 'running' });

describe('snake rules', () => {
  it('rejects reversing and accepts only one corner per tick', () => {
    const game = running();
    expect(turn(game, 'left')).toBe(game);
    const up = turn(game, 'up');
    expect(turn(up, 'left')).toBe(up);
    expect(tick(up, 0).snake[0]).toBe(190);
  });
  it('grows, scores and spawns food outside the body', () => {
    const game = { ...running(), food: 211 };
    const next = tick(game, .5);
    expect(next.score).toBe(10);
    expect(next.snake).toHaveLength(4);
    expect(next.snake).not.toContain(next.food);
    expect(game.snake).toEqual([210, 209, 208]);
  });
  it('distinguishes wall collisions, body collisions and the departing tail', () => {
    expect(tick({ ...running(), snake: [19, 18, 17] }, 0).status).toBe('lost');
    expect(tick({ ...running(), snake: [21, 22, 42, 41, 40, 20], direction: 'down' }, 0).status).toBe('lost');
    expect(tick({ ...running(), snake: [21, 22, 42, 41], direction: 'down', food: 399 }, 0).status).toBe('running');
  });
  it('wins when the board is filled and freezes while paused', () => {
    const snake = Array.from({ length: 399 }, (_, index) => index + 1);
    expect(foodPosition([...snake, 0], 0)).toBeNull();
    expect(tick({ ...running(), snake, direction: 'left', food: 0 }, 0).status).toBe('won');
    const paused = { ...running(), status: 'paused' as const };
    expect(tick(paused, 0)).toBe(paused);
  });
});

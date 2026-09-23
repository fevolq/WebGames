import { describe, expect, it } from 'vitest';
import { canMove, createBoard, createSession, gameReducer, gameStatus, moveBoard, spawnTile, type Direction } from './engine';

const board = (first: number[]) => [...first, ...Array<number>(16 - first.length).fill(0)];
const stuck = [2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2];

describe('2048 movement', () => {
  it.each([
    [[2, 2, 2, 2], [4, 4, 0, 0], 8],
    [[2, 2, 4, 0], [4, 4, 0, 0], 4],
    [[4, 0, 4, 4], [8, 4, 0, 0], 8],
    [[0, 2, 0, 4], [2, 4, 0, 0], 0],
  ])('compresses %j and merges each tile at most once', (input, expected, gain) => {
    const source = board(input as number[]);
    const original = [...source];
    const moved = moveBoard(source, 'left');
    expect(moved.board).toEqual(board(expected as number[]));
    expect(moved.gain).toBe(gain);
    expect(source).toEqual(original);
  });

  it.each<{ direction: Direction; indices: number[]; destination: number }>([
    { direction: 'left', indices: [1, 3], destination: 0 },
    { direction: 'right', indices: [0, 2], destination: 3 },
    { direction: 'up', indices: [4, 12], destination: 0 },
    { direction: 'down', indices: [0, 8], destination: 12 },
  ])('merges toward the $direction edge', ({ direction, indices, destination }) => {
    const source = board([]);
    indices.forEach((index) => { source[index] = 2; });
    const expected = board([]);
    expected[destination] = 4;
    expect(moveBoard(source, direction)).toEqual({ board: expected, gain: 4, changed: true });
  });

  it('spawns only in empty cells, with 2 below the 90% threshold and 4 above it', () => {
    expect(spawnTile(board([8]), [0, 0.899])).toEqual(board([8, 2]));
    expect(spawnTile(board([8]), [0, 0.9])).toEqual(board([8, 4]));
    expect(spawnTile(stuck, [0, 0])).toBe(stuck);
    const initial = createBoard([0, 0], [0.999, 0.95]);
    expect(initial.filter(Boolean)).toEqual([2, 4]);
    expect(initial[15]).toBe(4);
  });

  it('does not spawn, score, count a step or replace undo history for an invalid move', () => {
    const session = { ...createSession(board([2, 4])), previous: createSession(board([4, 2])).current };
    expect(gameReducer(session, { type: 'move', direction: 'left', rolls: [0, 0] })).toBe(session);
  });

  it('records valid moves and restores the exact board and score with one undo', () => {
    const session = createSession(board([2, 2]));
    const moved = gameReducer(session, { type: 'move', direction: 'left', rolls: [0, 0] });
    expect(moved.current).toEqual({ board: board([4, 2]), score: 4, moves: 1, continued: false });
    expect(moved.best).toBe(4);
    const undone = gameReducer(moved, { type: 'undo' });
    expect(undone.current).toEqual(session.current);
    expect(undone.best).toBe(4);
    expect(undone.previous).toBeNull();
    expect(gameReducer(undone, { type: 'undo' })).toBe(undone);
  });

  it('recognizes horizontal and vertical opportunities on a full board', () => {
    expect(canMove(stuck)).toBe(false);
    const horizontal = [...stuck];
    horizontal[0] = horizontal[1];
    expect(canMove(horizontal)).toBe(true);
    const vertical = [...stuck];
    vertical[0] = vertical[4];
    expect(canMove(vertical)).toBe(true);
    // Equal values across a row boundary are not adjacent.
    const wrapped = [2, 4, 8, 16, 16, 8, 4, 2, 2, 4, 8, 16, 16, 8, 4, 2];
    expect(canMove(wrapped)).toBe(false);
  });

  it('pauses on 2048, permits continuing, and does not repeatedly announce a win', () => {
    const session = createSession(board([1024, 1024]));
    const action = { type: 'move' as const, direction: 'left' as const, rolls: [0, 0] as const };
    const won = gameReducer(session, action);
    expect(won.current.score).toBe(2048);
    expect(gameStatus(won.current)).toBe('won');
    expect(gameReducer(won, action)).toBe(won);
    const continued = gameReducer(won, { type: 'continue' });
    expect(gameStatus(continued.current)).toBe('playing');
    expect(gameReducer(continued, { ...action, direction: 'down' }).current.moves).toBe(2);
  });

  it('stops a lost game and restarts without losing the best score', () => {
    const lost = createSession(stuck, 120);
    expect(gameStatus(lost.current)).toBe('lost');
    expect(gameReducer(lost, { type: 'move', direction: 'up', rolls: [0, 0] })).toBe(lost);
    const restarted = gameReducer(lost, { type: 'restart', board: board([2, 2]) });
    expect(restarted).toEqual(createSession(board([2, 2]), 120));
  });
});

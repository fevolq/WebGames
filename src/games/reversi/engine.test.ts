import { describe, expect, it } from 'vitest';
import { chooseMove, counts, finished, flips, initial, legalMoves, place, play, undo, type Position, type Session } from './engine';
import { decode } from './storage';

describe('reversi rules', () => {
  it('starts with four legal black moves and flips only bracketed pieces', () => {
    const game = initial();
    expect(legalMoves(game.board, 1)).toEqual([19, 26, 37, 44]);
    expect(place(game, 0)).toBe(game);
    const next = place(game, 19);
    expect(counts(next.board)).toEqual({ black: 4, white: 1 });
    expect(next.turn).toBe(2);
    expect(game.board[19]).toBe(0);
  });
  it('captures along all eight directions without wrapping rows', () => {
    const board = Array<number>(64).fill(0);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) {
      board[(3 + dy) * 8 + 3 + dx] = 2;
      board[(3 + dy * 2) * 8 + 3 + dx * 2] = 1;
    }
    expect(flips(board, 27, 1)).toHaveLength(8);
    const wrapped = Array<number>(64).fill(0); wrapped[8] = 2; wrapped[9] = 1;
    expect(flips(wrapped, 7, 1)).toEqual([]);
  });
  it('automatically passes a blocked color and ends when neither can play', () => {
    const board = Array<number>(64).fill(1); board[0] = board[3] = 0; board[1] = board[4] = 2;
    const game: Position = { board, turn: 1, passed: null, last: null };
    const next = place(game, 0);
    expect(next.turn).toBe(1);
    expect(next.passed).toBe(2);
    expect(finished(next.board)).toBe(false);
    const end = place(next, 3);
    expect(finished(end.board)).toBe(true);
    expect(counts(end.board)).toEqual({ black: 64, white: 0 });
  });
  it('chooses legal computer moves and undoes a whole human/computer turn', () => {
    const session: Session = { current: initial(), history: [], mode: 'computer' };
    const human = play(session, 19);
    const choice = chooseMove(human.current)!;
    expect(legalMoves(human.current.board, 2)).toContain(choice);
    const computer = play(human, choice);
    expect(undo(computer)).toEqual(session);
    expect(undo(human)).toEqual(session);
    const local = { ...computer, mode: 'local' as const };
    expect(undo(local).current).toEqual(human.current);
  });
  it('prefers a legal corner and returns no move at the end', () => {
    const board = Array<number>(64).fill(1); board[0] = board[3] = 0; board[1] = board[4] = 2;
    expect(chooseMove({ board, turn: 1, last: null, passed: null })).toBe(0);
    expect(chooseMove({ board: Array(64).fill(1), turn: 2, last: null, passed: null })).toBeNull();
  });
  it('preserves modes and history in a save while rejecting invalid boards', () => {
    const session = play({ current: initial(), history: [], mode: 'local' }, 19);
    expect(decode(JSON.stringify({ version: 1, ...session }))).toEqual(session);
    expect(decode(JSON.stringify({ version: 1, ...session, current: { ...session.current, board: [] } }))).toBeNull();
    expect(decode('invalid')).toBeNull();
  });
});

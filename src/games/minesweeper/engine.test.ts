import { describe, expect, it } from 'vitest';
import { createGame, DIFFICULTIES, flag, neighbors, placeMines, reveal, type MineState } from './engine';
import { decode } from './storage';
const fixture = (): MineState => ({ ...createGame(3, 1), board: [-1, 1, 0, 1, 1, 0, 0, 0, 0], status: 'playing' });

describe('minesweeper rules', () => {
  it.each(DIFFICULTIES)('makes the first click and its neighbors safe on $name', ({ size, mines }) => {
    for (const first of [0, Math.floor(size * size / 2), size * size - 1]) {
      const board = placeMines(size, mines, first, 123456);
      expect(board.filter((value) => value === -1)).toHaveLength(mines);
      expect(board[first]).toBe(0);
      expect(neighbors(first, size).every((index) => board[index] !== -1)).toBe(true);
      expect(board).toEqual(placeMines(size, mines, first, 123456));
    }
  });
  it('floods empty space and wins when all safe cells are revealed', () => {
    const won = reveal(fixture(), 8, 1);
    expect(won.status).toBe('won');
    expect(won.revealed.filter(Boolean)).toHaveLength(8);
    expect(won.flagged[0]).toBe(true);
  });
  it('protects flagged cells and limits the number of flags', () => {
    const flagged = flag(fixture(), 0);
    expect(reveal(flagged, 0, 1)).toBe(flagged);
    expect(flag(flagged, 1)).toBe(flagged);
    expect(flag(flagged, 0).flagged[0]).toBe(false);
  });
  it('chords only when the flag count matches, and wrong flags can trigger a mine', () => {
    const game = fixture();
    const revealed = [...game.revealed]; revealed[4] = true;
    const open = { ...game, revealed };
    expect(reveal(open, 4, 1)).toBe(open);
    expect(reveal(flag(open, 0), 4, 1).status).toBe('won');
    const lost = reveal(flag(open, 1), 4, 1);
    expect(lost.status).toBe('lost');
    expect(lost.exploded).toBe(0);
    expect(flag(lost, 2)).toBe(lost);
  });
  it('restores a valid board and rejects inconsistent mine counts, hints and reveal arrays', () => {
    const game = reveal(createGame(), 0, 132);
    expect(decode(JSON.stringify({ version: 1, game }))).toEqual(game);
    expect(decode(JSON.stringify({ version: 1, game: { ...game, revealed: [] } }))).toBeNull();
    expect(decode(JSON.stringify({ version: 1, game: { ...game, board: Array(81).fill(0) } }))).toBeNull();
    const board = [...game.board]; board[0] = 8;
    expect(decode(JSON.stringify({ version: 1, game: { ...game, board } }))).toBeNull();
    expect(decode('broken')).toBeNull();
  });
});

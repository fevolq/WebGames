import { describe, expect, it } from 'vitest';
import { cells, clearRows, createGame, descend, fits, hardDrop, landing, rotate, shift, shuffledBag, type BlockState, type Kind } from './engine';
import { decode } from './storage';
const bag: Kind[] = [1, 2, 3, 4, 5, 6, 7];
const running = (): BlockState => ({ ...createGame([...bag, ...bag]), status: 'running' });

describe('falling blocks', () => {
  it('uses each of the seven tetrominoes once per bag, with four cells in every rotation', () => {
    expect([...shuffledBag(() => .3)].sort()).toEqual(bag);
    for (const kind of bag) for (let rotation = 0; rotation < 4; rotation++) expect(cells({ kind, rotation, x: 0, y: 0 })).toHaveLength(4);
  });
  it('stops at walls and kicks a rotation away from the wall or floor', () => {
    const game = { ...running(), piece: { kind: 1 as const, rotation: 1, x: -2, y: 4 } };
    expect(shift(game, -1)).toBe(game);
    const rotated = rotate(game);
    expect(rotated.piece.rotation).toBe(2);
    expect(fits(rotated.board, rotated.piece)).toBe(true);
    const floor = rotate({ ...running(), piece: { kind: 1, rotation: 0, x: 3, y: 18 } });
    expect(floor.piece.rotation).toBe(1);
    expect(fits(floor.board, floor.piece)).toBe(true);
  });
  it('computes ghost landing without mutation and awards hard/soft drop points', () => {
    const game = running();
    expect(landing(game).y).toBe(18);
    expect(game.piece.y).toBe(0);
    expect(descend(game, bag, true).score).toBe(1);
    const dropped = hardDrop(game, bag);
    expect(dropped.score).toBe(36);
    expect(dropped.board.filter(Boolean)).toHaveLength(4);
    expect(dropped.piece.kind).toBe(2);
  });
  it('clears full rows, shifts remaining cells down, and scores four-line clears', () => {
    const board = Array<number>(200).fill(0);
    board[5] = 3;
    for (let y = 16; y < 20; y++) for (let x = 0; x < 10; x++) if (x !== 5) board[y * 10 + x] = 2;
    const game = { ...running(), board, piece: { kind: 1 as const, rotation: 1, x: 3, y: 16 } };
    const next = hardDrop(game, bag);
    expect(next.lines).toBe(4);
    expect(next.score).toBe(800);
    expect(next.board[45]).toBe(3);
    expect(next.board.filter(Boolean)).toHaveLength(1);
    expect(clearRows(board).cleared).toBe(0);
  });
  it('ends when the next piece cannot spawn and never advances a paused board', () => {
    const board = Array<number>(200).fill(0); board[4] = 3;
    const game = { ...running(), board, queue: [3, ...bag] as Kind[], piece: { kind: 2 as const, rotation: 0, x: 4, y: 18 } };
    expect(hardDrop(game, bag).status).toBe('lost');
    const paused = { ...running(), status: 'paused' as const };
    expect(descend(paused, bag)).toBe(paused);
  });
  it('restores a running save as paused and rejects malformed or overlapping saves', () => {
    const data = { version: 1, game: running(), best: 30 };
    expect(decode(JSON.stringify(data))?.game.status).toBe('paused');
    expect(decode(JSON.stringify({ ...data, game: { ...data.game, board: [] } }))).toBeNull();
    expect(decode(JSON.stringify({ ...data, game: { ...data.game, board: Array(200).fill(1) } }))).toBeNull();
    expect(decode('bad JSON')).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { createSession } from './engine';
import { decodeSession } from './storage';

const session = createSession([2, 4, ...Array<number>(14).fill(0)], 64);
const stored = { version: 1, ...session };

describe('2048 saves', () => {
  it('restores progress and a single undo, while preserving the highest score', () => {
    const current = { ...session.current, score: 128, moves: 12 };
    expect(decodeSession(JSON.stringify({ ...stored, current, previous: session.current })))
      .toEqual({ ...session, current, previous: session.current, best: 128 });
  });

  it.each([null, 'broken JSON', '{}', JSON.stringify({ ...stored, version: 2 }),
    JSON.stringify({ ...stored, current: { ...session.current, board: [2, 4] } }),
    JSON.stringify({ ...stored, current: { ...session.current, board: [3, ...session.current.board.slice(1)] } }),
    JSON.stringify({ ...stored, current: { ...session.current, score: -1 } }),
    JSON.stringify({ ...stored, current: { ...session.current, board: Array(16).fill(0) } }),
  ])('rejects corrupted or incompatible saves: %s', (raw) => {
    expect(decodeSession(raw)).toBeNull();
  });

  it('discards a damaged undo without discarding valid current progress', () => {
    expect(decodeSession(JSON.stringify({ ...stored, previous: { board: [3] } }))).toEqual(session);
  });
});

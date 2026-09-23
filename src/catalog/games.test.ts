import { describe, expect, it } from 'vitest';
import { games } from './games';
import { validateCatalog, type Game } from './model';
import { filterGames } from './search';

describe('catalog search', () => {
  it('combines category and case-insensitive search across names and tags', () => {
    expect(filterGames(games, 'puzzle', '  2048  ').map((g) => g.slug)).toEqual(['game_a']);
    expect(filterGames(games, 'all', 'SNAKE').map((g) => g.slug)).toEqual(['game_b']);
    expect(filterGames(games, 'strategy', '数字')).toEqual([]);
    expect(filterGames(games, 'puzzle', '经典 扫雷').map((g) => g.slug)).toEqual(['minesweeper']);
  });
  it('handles empty catalogs, blank queries, and unmatched searches', () => {
    expect(filterGames([], 'all', '')).toEqual([]);
    expect(filterGames(games, 'all', '   ')).toHaveLength(games.length);
    expect(filterGames(games, 'all', '不存在的游戏')).toEqual([]);
  });
});

describe('route registration', () => {
  it('rejects duplicate, unsafe, and reserved paths', () => {
    expect(() => validateCatalog([games[0], games[0]])).toThrow('Duplicate');
    for (const slug of ['assets', 'api', '../bad', 'game/a', 'bad name', 'UPPER', 'game;']) {
      expect(() => validateCatalog([{ ...games[0], slug }])).toThrow('Invalid');
    }
  });
  it('allows root slugs with underscores and hyphens and rejects playable demos', () => {
    expect(() => validateCatalog(games)).not.toThrow();
    expect(() => validateCatalog([{ ...games[0], status: 'available' } as Game])).toThrow('Demo');
  });
});

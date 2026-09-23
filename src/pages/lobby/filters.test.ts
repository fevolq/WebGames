import { describe, expect, it } from 'vitest';
import { readLobbyFilters, updateLobbyFilters } from './filters';

describe('lobby URL filters', () => {
  it('restores shared filters and falls back for unknown categories', () => {
    expect(readLobbyFilters(new URLSearchParams('category=puzzle&q=2048')))
      .toEqual({ category: 'puzzle', query: '2048' });
    expect(readLobbyFilters(new URLSearchParams('category=unknown&q=snake')))
      .toEqual({ category: 'all', query: 'snake' });
    expect(readLobbyFilters(new URLSearchParams()))
      .toEqual({ category: 'all', query: '' });
  });

  it('keeps the literal search term all instead of treating it as a category reset', () => {
    const next = updateLobbyFilters(new URLSearchParams('category=puzzle'), { query: 'all' });
    expect(readLobbyFilters(next)).toEqual({ category: 'puzzle', query: 'all' });
  });

  it('switches to all categories without dropping the search or unrelated parameters', () => {
    const original = new URLSearchParams('category=puzzle&q=扫雷&source=bookmark');
    const next = updateLobbyFilters(original, { category: 'all' });
    expect(next.has('category')).toBe(false);
    expect(next.get('q')).toBe('扫雷');
    expect(next.get('source')).toBe('bookmark');
    expect(original.get('category')).toBe('puzzle');
  });

  it('clears only lobby filters and preserves other URL state', () => {
    const next = updateLobbyFilters(new URLSearchParams('category=puzzle&q=2048&source=bookmark'), {
      category: 'all', query: '',
    });
    expect(next.toString()).toBe('source=bookmark');
  });

  it('round-trips search text with spaces and URL-reserved characters', () => {
    const query = ' 数字 & snake+?# ';
    const next = updateLobbyFilters(new URLSearchParams(), { query });
    expect(readLobbyFilters(new URLSearchParams(next.toString())).query).toBe(query);
    expect(updateLobbyFilters(next, { query: '' }).has('q')).toBe(false);
  });
});

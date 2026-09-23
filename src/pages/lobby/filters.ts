import { isCategory, type Category } from '../../catalog/model';

export interface LobbyFilters {
  category: Category;
  query: string;
}

export function readLobbyFilters(params: URLSearchParams): LobbyFilters {
  const category = params.get('category');
  return {
    category: isCategory(category) ? category : 'all',
    query: params.get('q') ?? '',
  };
}

export function updateLobbyFilters(params: URLSearchParams, changes: Partial<LobbyFilters>) {
  const next = new URLSearchParams(params);
  if (changes.category !== undefined) {
    if (changes.category === 'all') next.delete('category');
    else next.set('category', changes.category);
  }
  if (changes.query !== undefined) {
    if (changes.query === '') next.delete('q');
    else next.set('q', changes.query);
  }
  return next;
}

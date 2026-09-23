import { useSearchParams } from 'react-router-dom';
import type { Category } from '../../catalog/model';
import { readLobbyFilters, updateLobbyFilters, type LobbyFilters } from './filters';

export function useLobbyFilters() {
  const [params, setParams] = useSearchParams();
  const filters = readLobbyFilters(params);

  function update(changes: Partial<LobbyFilters>) {
    setParams((previous) => updateLobbyFilters(previous, changes), {
      replace: true,
      preventScrollReset: true,
    });
  }

  return {
    ...filters,
    hasFilters: filters.category !== 'all' || filters.query.trim() !== '',
    setCategory: (category: Category) => update({ category }),
    setQuery: (query: string) => update({ query }),
    clearFilters: () => update({ category: 'all', query: '' }),
  };
}

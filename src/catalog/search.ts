import type { Category, Game } from './model';

export function filterGames(catalog: readonly Game[], category: Category, query: string) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return catalog.filter((game) => {
    const searchable = [game.name, game.englishName, game.description, ...game.tags]
      .join(' ').toLocaleLowerCase();
    return (category === 'all' || game.category === category)
      && terms.every((term) => searchable.includes(term));
  });
}

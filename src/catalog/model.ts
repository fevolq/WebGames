export const categories = [
  { id: 'all', label: '全部游戏', shortLabel: '全部', icon: 'grid' },
  { id: 'puzzle', label: '益智烧脑', shortLabel: '益智', icon: 'puzzle' },
  { id: 'casual', label: '轻松休闲', shortLabel: '休闲', icon: 'coffee' },
  { id: 'action', label: '动作挑战', shortLabel: '动作', icon: 'bolt' },
  { id: 'strategy', label: '策略对弈', shortLabel: '策略', icon: 'flag' },
] as const;

export type Category = typeof categories[number]['id'];
export type GameStatus = 'available' | 'coming-soon' | 'maintenance';

export interface Game {
  slug: string;
  name: string;
  englishName: string;
  description: string;
  category: Exclude<Category, 'all'>;
  tags: readonly string[];
  cover: string;
  status: GameStatus;
  demo?: boolean;
  featured?: boolean;
  controls: string;
}

export const gamePath = (game: Pick<Game, 'slug'>) => `/${game.slug}`;

export function isCategory(value: string | null): value is Category {
  return categories.some((category) => category.id === value);
}

export function validateCatalog(catalog: readonly Game[]) {
  const reserved = new Set(['assets', 'covers', 'about', 'api', 'health', 'index', '404']);
  const seen = new Set<string>();
  for (const game of catalog) {
    if (!/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(game.slug) || reserved.has(game.slug)) {
      throw new Error(`Invalid or reserved game slug: ${game.slug}`);
    }
    if (seen.has(game.slug)) throw new Error(`Duplicate game slug: ${game.slug}`);
    if (!game.name.trim()) throw new Error(`Missing game name: ${game.slug}`);
    if (game.status === 'available' && game.demo) {
      throw new Error(`Demo game cannot be marked available: ${game.slug}`);
    }
    seen.add(game.slug);
  }
}

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

// These are clearly labelled catalog previews, not implemented games.
// Add src/games/<slug>/index.tsx before changing a game's status to available.
export const games: readonly Game[] = [
  {
    slug: 'game_a', name: '数字叠叠', englishName: '2048',
    description: '让数字相遇，向下一个 2048 出发。',
    category: 'puzzle', tags: ['数字', '合成', '2048'],
    cover: '/covers/2048.svg', status: 'coming-soon', demo: true,
    featured: true, controls: '方向键',
  },
  {
    slug: 'game_b', name: '贪吃蛇漫游', englishName: 'SNAKE CLUB',
    description: '绕个弯，再吃一口。别碰到自己！',
    category: 'casual', tags: ['经典', '街机', 'snake'],
    cover: '/covers/snake.svg', status: 'coming-soon', demo: true,
    controls: '方向键',
  },
  {
    slug: 'block-drop', name: '方块降落', englishName: 'BLOCK DROP',
    description: '旋转、落下，把每一块放在刚好的位置。',
    category: 'puzzle', tags: ['方块', '消除', 'tetris'],
    cover: '/covers/blocks.svg', status: 'coming-soon', demo: true,
    controls: '键盘',
  },
  {
    slug: 'space-run', name: '星际穿梭', englishName: 'SPACE RUN',
    description: '穿过星群，把日常留在地球。',
    category: 'action', tags: ['太空', '飞行', '躲避'],
    cover: '/covers/space.svg', status: 'coming-soon', demo: true,
    controls: '键盘',
  },
  {
    slug: 'minesweeper', name: '扫雷小队', englishName: 'MINE FINDER',
    description: '每一步有依据，每一格都是新线索。',
    category: 'puzzle', tags: ['扫雷', '推理', '经典'],
    cover: '/covers/mines.svg', status: 'coming-soon', demo: true,
    controls: '鼠标',
  },
  {
    slug: 'reversi', name: '黑白之间', englishName: 'REVERSI',
    description: '落下一子，让局势悄悄翻转。',
    category: 'strategy', tags: ['黑白棋', '棋盘', '策略'],
    cover: '/covers/reversi.svg', status: 'coming-soon', demo: true,
    controls: '鼠标',
  },
];

export const gamePath = (game: Pick<Game, 'slug'>) => `/${game.slug}`;

export function isCategory(value: string | null): value is Category {
  return categories.some((category) => category.id === value);
}

export function filterGames(catalog: readonly Game[], category: Category, query: string) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return catalog.filter((game) => {
    const searchable = [game.name, game.englishName, game.description, ...game.tags]
      .join(' ').toLocaleLowerCase();
    return (category === 'all' || game.category === category)
      && terms.every((term) => searchable.includes(term));
  });
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

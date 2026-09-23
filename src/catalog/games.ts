import type { Game } from './model';

// Catalog metadata only: do not import game implementations into this file.
// These entries are previews, not implemented games.
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

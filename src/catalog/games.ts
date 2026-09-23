import type { Game } from './model';

// Catalog metadata only: do not import game implementations into this file.
// Only implemented games may be marked available.
// Add src/games/<slug>/index.tsx before changing a game's status to available.
export const games: readonly Game[] = [
  {
    slug: '2048', name: '2048', englishName: '2048',
    description: '让数字相遇，向下一个 2048 出发。',
    category: 'puzzle', tags: ['数字', '合成', '2048'],
    cover: '/covers/2048.svg', status: 'available',
  },
  {
    slug: 'snake', name: '贪吃蛇', englishName: 'SNAKE CLUB',
    description: '绕个弯，再吃一口。别碰到自己！',
    category: 'casual', tags: ['经典', '街机', 'snake'],
    cover: '/covers/snake.svg', status: 'available',
  },
  {
    slug: 'block-drop', name: '俄罗斯方块', englishName: 'BLOCK DROP',
    description: '旋转、落下，把每一块放在刚好的位置。',
    category: 'puzzle', tags: ['方块', '消除', 'tetris'],
    cover: '/covers/blocks.svg', status: 'available',
  },
  {
    slug: 'space-run', name: '星际穿梭', englishName: 'SPACE RUN',
    description: '穿过星群，把日常留在地球。',
    category: 'action', tags: ['太空', '飞行', '躲避'],
    cover: '/covers/space.svg', status: 'available',
  },
  {
    slug: 'minesweeper', name: '扫雷', englishName: 'MINE FINDER',
    description: '每一步有依据，每一格都是新线索。',
    category: 'puzzle', tags: ['扫雷', '推理', '经典'],
    cover: '/covers/mines.svg', status: 'available',
  },
  {
    slug: 'reversi', name: '黑白棋', englishName: 'REVERSI',
    description: '落下一子，让局势悄悄翻转。',
    category: 'strategy', tags: ['黑白棋', '棋盘', '策略'],
    cover: '/covers/reversi.svg', status: 'available',
  },
];

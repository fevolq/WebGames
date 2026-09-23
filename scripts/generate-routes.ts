import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { games } from '../src/catalog/games';
import { validateCatalog } from '../src/catalog/model';
import { nginxConfig } from './nginx-config';
import { coverMimeType } from './asset-types';

validateCatalog(games);
for (const game of games) {
  if (game.status === 'available' && !existsSync(resolve(`src/games/${game.slug}/index.tsx`))) {
    throw new Error(`Available game is missing its module: src/games/${game.slug}/index.tsx`);
  }
  if (!game.cover.startsWith('/covers/') || game.cover.includes('..') || !existsSync(resolve(`public${game.cover}`))) {
    throw new Error(`Missing or invalid local game cover: ${game.cover}`);
  }
  coverMimeType(game.cover);
}
await mkdir('.artifacts/nginx', { recursive: true });
await writeFile('.artifacts/nginx/default.conf', nginxConfig(games));
console.log(`Validated ${games.length} games and generated Nginx routes in .artifacts/nginx/default.conf`);

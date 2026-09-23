import assert from 'node:assert/strict';
import { games } from '../src/catalog/games';

const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:8080';
async function get(path: string, status = 200) {
  const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(10_000) });
  assert.equal(response.status, status, `${path}: unexpected HTTP status`);
  console.log(`${status} ${path}`);
  return response;
}

const home = await get('/');
assert.match(home.headers.get('content-type') ?? '', /text\/html/);
assert.match(home.headers.get('cache-control') ?? '', /no-cache/);
const html = await home.text();
assert.match(html, /id="root"/);
for (const { slug, cover } of games) {
  for (const path of [`/${slug}`, `/${slug}/`]) {
    const response = await get(path);
    assert.equal(await response.text(), html, `${path} should load the same application entry`);
  }
  const image = await get(cover);
  assert.match(image.headers.get('content-type') ?? '', /image\/svg\+xml/);
}

const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)].map((match) => match[1]);
assert(assets.some((path) => path.endsWith('.js')), 'Missing JavaScript build asset');
assert(assets.some((path) => path.endsWith('.css')), 'Missing CSS build asset');
for (const path of assets) {
  const response = await get(path);
  assert.match(response.headers.get('content-type') ?? '', path.endsWith('.js') ? /javascript/ : /text\/css/);
  assert.match(response.headers.get('cache-control') ?? '', /max-age=31536000/);
}

for (const path of ['/not-a-game', '/game_a/missing', '/assets/missing.js', '/covers/missing.svg']) {
  const response = await get(path, 404);
  assert.match(await response.text(), /页面未找到/);
}
console.log('Deployment smoke checks passed.');

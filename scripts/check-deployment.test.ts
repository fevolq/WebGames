import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Manifest } from 'vite';
import { games } from '../src/catalog/games';
import { coverMimeType } from './asset-types';
import { checkDeployment, collectBuildAssets } from './check-deployment';

const manifest: Manifest = {
  'index.html': { file: 'assets/index-abc.js', isEntry: true, css: ['assets/index-abc.css'], dynamicImports: ['src/pages/lobby/Lobby.tsx'] },
  'src/pages/lobby/Lobby.tsx': { file: 'assets/Lobby-def.js', isDynamicEntry: true, css: ['assets/Lobby-def.css'], imports: ['index.html'] },
};
const html = '<div id="root"></div><script src="/assets/index-abc.js"></script><link href="/assets/index-abc.css">';
const catalog = [
  { ...games[0], slug: 'svg-preview', cover: '/covers/example.svg' },
  { ...games[0], slug: 'png-preview', cover: '/covers/example.png' },
];

describe('build manifest assets', () => {
  it('includes dynamic JS and CSS even when only the entry is in HTML', () => {
    expect(collectBuildAssets(manifest)).toEqual([
      '/assets/Lobby-def.css', '/assets/Lobby-def.js', '/assets/index-abc.css', '/assets/index-abc.js',
    ]);
  });

  it('includes imported assets, deduplicates files, and rejects broken dependencies', () => {
    expect(collectBuildAssets({ ...manifest, image: { file: 'assets/cover-abc.png', assets: ['assets/cover-abc.png'] } }))
      .toContain('/assets/cover-abc.png');
    expect(() => collectBuildAssets({ 'index.html': manifest['index.html'] })).toThrow('Missing manifest dependency');
    expect(() => collectBuildAssets({ 'index.html': { file: 'assets/../outside.js', isEntry: true } })).toThrow('Invalid build asset');
  });

  it.each([
    ['svg', 'image/svg+xml'], ['png', 'image/png'], ['jpg', 'image/jpeg'], ['jpeg', 'image/jpeg'],
    ['webp', 'image/webp'], ['gif', 'image/gif'], ['avif', 'image/avif'],
  ])('recognizes %s cover MIME', (extension, type) => {
    expect(coverMimeType(`/covers/example.${extension}`)).toBe(type);
  });

  it('rejects unsupported cover formats before deployment', () => {
    expect(() => coverMimeType('/covers/example.html')).toThrow('Unsupported cover format');
  });
});

describe('deployment regressions', () => {
  const fixtureRoot = resolve('.artifacts/deployment-tests');
  let buildDir: string;
  let resources: Map<string, { body: Buffer; type: string; cache: string }>;
  let requested: string[];

  beforeEach(async () => {
    await mkdir(fixtureRoot, { recursive: true });
    buildDir = await mkdtemp(join(fixtureRoot, 'case-'));
    requested = [];
    resources = new Map([
      ['/assets/index-abc.js', { body: Buffer.from('export const index = 1;'), type: 'text/javascript', cache: 'max-age=31536000' }],
      ['/assets/index-abc.css', { body: Buffer.from('body { margin: 0; }'), type: 'text/css', cache: 'max-age=31536000' }],
      ['/assets/Lobby-def.js', { body: Buffer.from('export const lobby = 1;'), type: 'application/javascript', cache: 'max-age=31536000' }],
      ['/assets/Lobby-def.css', { body: Buffer.from('.lobby { display: grid; }'), type: 'text/css', cache: 'max-age=31536000' }],
      ['/covers/example.svg', { body: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), type: 'image/svg+xml', cache: 'no-cache' }],
      ['/covers/example.png', { body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX9sAAAAASUVORK5CYII=', 'base64'), type: 'image/png', cache: 'no-cache' }],
    ]);
    await mkdir(join(buildDir, '.vite'));
    await writeFile(join(buildDir, 'index.html'), html);
    await writeFile(join(buildDir, '.vite/manifest.json'), JSON.stringify(manifest));
    for (const [path, resource] of resources) {
      const file = resolve(buildDir, `.${path}`);
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, resource.body);
    }
    for (const path of ['/', '/svg-preview', '/svg-preview/', '/png-preview', '/png-preview/']) {
      resources.set(path, { body: Buffer.from(html), type: 'text/html; charset=utf-8', cache: 'no-cache' });
    }
  });

  afterEach(async () => {
    if (buildDir && dirname(buildDir) === fixtureRoot) await rm(buildDir, { recursive: true, force: true });
  });

  const request: typeof fetch = async (input) => {
    const path = new URL(input instanceof Request ? input.url : String(input)).pathname;
    requested.push(path);
    const resource = resources.get(path);
    if (!resource) return new Response('页面未找到', { status: 404, headers: { 'content-type': 'text/html' } });
    return new Response(new Uint8Array(resource.body), {
      headers: { 'content-type': resource.type, 'cache-control': resource.cache },
    });
  };
  const run = () => checkDeployment({ baseUrl: 'http://localhost:8080', buildDir, catalog, request });

  it('checks all chunks and accepts both SVG and PNG covers', async () => {
    await expect(run()).resolves.toEqual({ assets: 4, covers: 2 });
    expect(requested).toEqual(expect.arrayContaining(['/assets/Lobby-def.js', '/assets/Lobby-def.css', '/covers/example.png']));
  });

  it.each(['/assets/Lobby-def.js', '/assets/Lobby-def.css'])('fails if lazy resource %s is missing', async (path) => {
    resources.delete(path);
    await expect(run()).rejects.toThrow(`${path}: unexpected HTTP status`);
  });

  it('rejects HTML served instead of a lazy chunk', async () => {
    resources.set('/assets/Lobby-def.js', { body: Buffer.from(html), type: 'text/html', cache: 'max-age=31536000' });
    await expect(run()).rejects.toThrow('/assets/Lobby-def.js: unexpected Content-Type');
  });

  it('rejects a stale chunk even when its status and headers are correct', async () => {
    resources.get('/assets/Lobby-def.js')!.body = Buffer.from('export const stale = true;');
    await expect(run()).rejects.toThrow('/assets/Lobby-def.js: content differs');
  });

  it('rejects incorrect cover MIME and asset caching', async () => {
    resources.get('/covers/example.png')!.type = 'image/svg+xml';
    await expect(run()).rejects.toThrow('/covers/example.png: unexpected Content-Type');
    resources.get('/covers/example.png')!.type = 'image/png';
    resources.get('/assets/Lobby-def.css')!.cache = 'no-cache';
    await expect(run()).rejects.toThrow('/assets/Lobby-def.css: unexpected cache policy');
  });

  it('rejects a deployed entry from another build', async () => {
    resources.get('/')!.body = Buffer.from('<div id="root">older build</div>');
    await expect(run()).rejects.toThrow('deployed HTML differs');
  });
});

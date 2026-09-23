import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Manifest } from 'vite';
import type { Game } from '../src/catalog/model';
import { assetMimeTypes, coverMimeType } from './asset-types';

export function collectBuildAssets(manifest: Manifest) {
  assert(Object.values(manifest).some((chunk) => chunk.isEntry), 'Build manifest has no entry');
  const assets = new Set<string>();
  for (const [key, chunk] of Object.entries(manifest)) {
    for (const dependency of [...(chunk.imports ?? []), ...(chunk.dynamicImports ?? [])]) {
      assert(manifest[dependency], `Missing manifest dependency ${dependency} from ${key}`);
    }
    for (const file of [chunk.file, ...(chunk.css ?? []), ...(chunk.assets ?? [])]) {
      assert(file.startsWith('assets/') && !/[?#\\]/.test(file)
        && file.split('/').every((part) => part && part !== '.' && part !== '..'),
      `Invalid build asset path: ${file}`);
      assets.add(`/${file}`);
    }
  }
  return [...assets].sort();
}

interface DeploymentOptions {
  baseUrl: string;
  buildDir: string;
  catalog: readonly Game[];
  request?: typeof fetch;
  log?: (message: string) => void;
}

export async function checkDeployment({ baseUrl, buildDir, catalog, request = fetch, log = () => {} }: DeploymentOptions) {
  const [expectedHtml, rawManifest] = await Promise.all([
    readFile(resolve(buildDir, 'index.html'), 'utf8'),
    readFile(resolve(buildDir, '.vite/manifest.json'), 'utf8'),
  ]);
  const manifest: Manifest = JSON.parse(rawManifest);
  const assets = collectBuildAssets(manifest);
  const entry = manifest['index.html'];
  assert(entry?.isEntry && expectedHtml.includes(`/${entry.file}`), 'Manifest and local HTML do not match');

  async function get(path: string, status = 200) {
    const response = await request(new URL(path, baseUrl), { signal: AbortSignal.timeout(10_000), redirect: 'error' });
    assert.equal(response.status, status, `${path}: unexpected HTTP status`);
    log(`${status} ${path}`);
    return response;
  }

  function checkType(response: Response, path: string, types: readonly string[]) {
    const actual = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
    assert(actual && (types.length ? types.includes(actual) : actual !== 'text/html'),
      `${path}: unexpected Content-Type ${actual ?? '(missing)'}`);
  }

  for (const path of ['/', ...catalog.flatMap(({ slug }) => [`/${slug}`, `/${slug}/`])]) {
    const response = await get(path);
    checkType(response, path, ['text/html']);
    assert.match(response.headers.get('cache-control') ?? '', /(?:^|[,\s])no-cache(?:$|[,\s])/,
      `${path}: HTML must revalidate`);
    assert.equal(await response.text(), expectedHtml, `${path}: deployed HTML differs from this build`);
  }

  for (const path of new Set([...assets, ...catalog.map(({ cover }) => cover)])) {
    const generated = assets.includes(path);
    const response = await get(path);
    checkType(response, path, generated ? assetMimeTypes(path) : [coverMimeType(path)]);
    assert.match(response.headers.get('cache-control') ?? '', generated ? /max-age=31536000/ : /no-cache/,
      `${path}: unexpected cache policy`);
    // Headers alone cannot detect empty or stale chunks; compare the deployed bytes too.
    const expected = await readFile(resolve(buildDir, `.${path}`));
    const actual = Buffer.from(await response.arrayBuffer());
    assert(actual.equals(expected), `${path}: content differs from this build`);
  }

  const missingChild = `/${catalog[0]?.slug ?? '__missing_game__'}/__missing__`;
  for (const path of ['/__missing_game__', missingChild, '/assets/__missing__.js', '/covers/__missing__.png']) {
    const response = await get(path, 404);
    assert.match(await response.text(), /页面未找到/, `${path}: missing 404 page`);
  }
  return { assets: assets.length, covers: new Set(catalog.map(({ cover }) => cover)).size };
}

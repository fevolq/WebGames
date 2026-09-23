import { extname } from 'node:path';

const imageTypes: Record<string, string> = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
};

export function coverMimeType(path: string) {
  const type = imageTypes[extname(path).toLowerCase()];
  if (!type) throw new Error(`Unsupported cover format: ${path}`);
  return type;
}

export function assetMimeTypes(path: string): readonly string[] {
  const extension = extname(path).toLowerCase();
  const imageType = imageTypes[extension];
  if (imageType) return [imageType];
  switch (extension) {
    case '.js': case '.mjs': return ['application/javascript', 'text/javascript'];
    case '.css': return ['text/css'];
    case '.json': return ['application/json'];
    case '.woff': return ['font/woff', 'application/font-woff'];
    case '.woff2': return ['font/woff2'];
    case '.wasm': return ['application/wasm'];
    default: return [];
  }
}

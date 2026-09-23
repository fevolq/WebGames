import { describe, expect, it } from 'vitest';
import { games } from '../src/catalog/games';
import { nginxConfig } from './nginx-config';

describe('deployment routes', () => {
  it('gives registered pages their own refresh fallback, not static assets', () => {
    const config = nginxConfig(games);
    for (const { slug } of games) {
      expect(config).toContain(`location = /${slug} {\n    try_files /index.html =404;`);
      expect(config).toContain(`location = /${slug}/ {\n    try_files /index.html =404;`);
    }
    expect(config).toContain('location /assets/ {\n    try_files $uri =404;');
    expect(config).toContain('location / {\n    try_files $uri =404;');
    expect(config).toContain('error_page 404 /404.html;');
  });
});

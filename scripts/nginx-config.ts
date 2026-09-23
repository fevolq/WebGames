import { validateCatalog, type Game } from '../src/catalog/model';

export function nginxConfig(catalog: readonly Game[]) {
  validateCatalog(catalog);
  const pagePaths = ['/', ...catalog.flatMap(({ slug }) => [`/${slug}`, `/${slug}/`])];
  return `# Generated from src/catalog/games.ts by npm run build. Do not edit.
server {
  listen 80;
  server_name _;
  root /usr/share/nginx/html;
  index index.html;
  charset utf-8;
  server_tokens off;

  add_header X-Content-Type-Options nosniff always;
  add_header Referrer-Policy strict-origin-when-cross-origin always;

  gzip on;
  gzip_types text/css application/javascript application/json image/svg+xml;
  gzip_min_length 1024;

${pagePaths.map((path) => `  location = ${path} {
    try_files /index.html =404;
    expires -1;
  }`).join('\n\n')}

  location /assets/ {
    try_files $uri =404;
    expires 1y;
  }

  location / {
    try_files $uri =404;
    expires -1;
  }

  error_page 404 /404.html;
  location = /404.html {
    internal;
    expires -1;
  }
}
`;
}

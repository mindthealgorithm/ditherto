import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.json': 'application/json' };
const server = createServer(async (request, response) => {
  try {
    const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (path === '/') { response.writeHead(302, { Location: '/examples/browser-demo.html' }).end(); return; }
    const relative = path.slice(1);
    const target = resolve(root, relative);
    if (!target.startsWith(root)) throw new Error('Invalid path');
    if (!['examples/', 'dist/', 'tests/fixtures/'].some(prefix => relative.startsWith(prefix)) || relative.split('/').includes('..')) {
      response.writeHead(404).end(); return;
    }
    const body = await readFile(target);
    response.writeHead(200, { 'Content-Type': mime[extname(target)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(body);
  } catch { response.writeHead(404).end('Not found'); }
});
server.listen(Number(process.env.PORT ?? 4173), '127.0.0.1', () => console.log('ditherto playground: http://127.0.0.1:4173'));

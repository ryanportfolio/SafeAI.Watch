// Static server for the logo lab, rooted at the worktree root so boards can reach the repo's font files.
// Local only: binds to loopback. Usage: node brand-lab/serve.mjs  ->  http://localhost:4330/brand-lab/
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const types = { '.html': 'text/html', '.svg': 'image/svg+xml', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.png': 'image/png', '.md': 'text/plain; charset=utf-8' };

createServer(async (req, res) => {
  let p;
  try {
    p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  } catch {
    res.writeHead(400).end('bad request');
    return;
  }
  if (p.endsWith('/')) p += 'index.html';
  const file = resolve(join(root, p));
  const rel = relative(root, file);
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) { res.writeHead(403).end(); return; }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' }).end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
}).listen(4330, '127.0.0.1', () => console.log('http://localhost:4330/brand-lab/'));

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import handler from './api/ping.js';

const files = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/styles.css': ['styles.css', 'text/css; charset=utf-8'],
};
createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  if (path === '/api/ping') return handler(req, res);
  const file = files[path];
  if (!file) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.setHeader('Content-Type', file[1]);
  res.end(await readFile(new URL(`public/${file[0]}`, import.meta.url)));
}).listen(4179, '127.0.0.1');

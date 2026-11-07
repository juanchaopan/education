
const {createServer} = require('node:http');
const {readFile} = require('node:fs/promises');
const {join} = require('node:path');
const assets = {
  '/': ['index.html', 'text/html'],
  '/scene.css': ['scene.css', 'text/css'],
  '/scene.js': ['scene.js', 'text/javascript'],
};
createServer(async (request, response) => {
  const asset = assets[request.url];
  if (!asset || !Array.isArray(asset)) {
    response.writeHead(404).end();
    return;
  }
  try {
    const bytes = await readFile(join(__dirname, asset[0]));
    response.writeHead(200, {'Content-Type': asset[1] + '; charset=utf-8'}).end(bytes);
  } catch {
    response.writeHead(500).end();
  }
}).listen(4848, '127.0.0.1', () => console.log('http://127.0.0.1:4848/'));


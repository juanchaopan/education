import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import fastifyStatic from '@fastify/static';
import { buildApp } from './app.js';
import { readConfig } from './shared/config.js';

const config = readConfig();
const app = buildApp();
const webRoot = fileURLToPath(new URL('../../web/dist/', import.meta.url));
if (existsSync(webRoot)) {
  await app.register(fastifyStatic, { root: webRoot });
  app.setNotFoundHandler((request, reply) => {
    if (request.url.startsWith('/api/') || request.url.startsWith('/health/')) {
      return reply.code(404).send({ message: '没有找到这个接口' });
    }
    return reply.sendFile('index.html');
  });
}
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.once(signal, () => {
    void app.close();
  });
}
await app.listen({ port: config.port, host: config.host });

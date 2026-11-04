import { randomBytes } from 'node:crypto';
import { createSessionService } from './identity/services/session.js';
import { createSessionRepository } from './identity/repositories/postgres-session.js';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import fastifyStatic from '@fastify/static';
import { buildApp } from './app.js';
import { readConfig } from './shared/config.js';
import pg from 'pg';
import { createRegistrationService } from './identity/services/registration.js';
import { hashParentPassword, verifyParentPassword } from './identity/services/password.js';
import { createRegistrationStore } from './identity/repositories/postgres-registration.js';
import { createAuthAdmission } from './identity/repositories/auth-admission.js';

const config = readConfig();
const pool = config.registrationEnabled
  ? new pg.Pool({
      connectionString: config.databaseUrl,
      max: 10,
      connectionTimeoutMillis: 1000,
      statement_timeout: 3000,
    })
  : undefined;
const admit = pool ? createAuthAdmission(pool, config.rateLimitKey!) : undefined;
const registration = pool
  ? createRegistrationService({
      save: createRegistrationStore(pool),
      admit: admit!,
      hash: hashParentPassword,
    })
  : undefined;
const sessions = pool
  ? createSessionService({
      repository: createSessionRepository(pool),
      admit: admit!,
      verify: verifyParentPassword,
      dummyHash: await hashParentPassword(randomBytes(32).toString('base64url')),
    })
  : undefined;
const app = buildApp({ origin: config.origin, registration, sessions });
app.addHook('onClose', async () => {
  await pool?.end();
});
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

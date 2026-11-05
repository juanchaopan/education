import { createChildAccessService } from './identity/services/child-access.js';
import { createChildAccessRepository } from './identity/repositories/postgres-child-access.js';
import { createChildRegistrationService } from './identity/services/child-registration.js';
import { createChildSessionService } from './identity/services/child-session.js';
import { createChildSessionRepository } from './identity/repositories/postgres-child-session.js';
import { createPinMaterial } from './identity/services/child-pin.js';
import { createChildRegistrationRepository } from './identity/repositories/postgres-child-registration.js';
import { createChildPin, createReplacementPin } from './identity/services/child-pin.js';
import { createRegistrationKeyService } from './identity/services/registration-key.js';
import { createRegistrationKeyRepository } from './identity/repositories/postgres-registration-key.js';
import { createReauthenticationService } from './identity/services/reauthentication.js';
import { createReauthenticationRepository } from './identity/repositories/postgres-reauthentication.js';
import { createRecoveryService } from './identity/services/recovery.js';
import { createRecoveryRepository } from './identity/repositories/postgres-recovery.js';
import { recoveryEmail } from './shared/recovery-email.js';
import { verificationEmail } from './shared/verification-email.js';
import { readMailConfig } from './shared/mail-config.js';
import { createMailPayload } from './shared/mail-payload.js';
import { createGmailSender } from './shared/gmail.js';
import { createVerificationService } from './identity/services/verification.js';
import { createVerificationRepository } from './identity/repositories/postgres-verification.js';
import { randomBytes } from 'node:crypto';
import { createSessionService } from './identity/services/session.js';
import { createSessionRepository } from './identity/repositories/postgres-session.js';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { buildApp } from './app.js';
import { readConfig } from './shared/config.js';
import pg from 'pg';
import { createRegistrationService } from './identity/services/registration.js';
import { hashParentPassword, verifyParentPassword } from './identity/services/password.js';
import { createRegistrationStore } from './identity/repositories/postgres-registration.js';
import { createAuthAdmission } from './identity/repositories/auth-admission.js';
import { createReadinessCheck } from './database/readiness.js';
import { databaseOptions } from './shared/database-config.js';
import { readRevision } from './shared/revision.js';

export async function createApplication(env: NodeJS.ProcessEnv = process.env) {
  const config = readConfig(env);
  const mailConfig = readMailConfig(env);
  const pool = config.registrationEnabled
    ? new pg.Pool({
        ...databaseOptions(env),
        max: env.VERCEL === '1' ? 4 : 10,
        connectionTimeoutMillis: config.connectionTimeoutMs,
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
  const { sessions, childSessions } = await createIdentitySessions(pool, config, admit);
  const app = buildApp({
    origin: config.origin,
    registration,
    sessions,
    childRegistration: createChildRegistration(pool, config, admit),
    childSessions,
    childAccess: createChildAccess(pool, sessions, admit, config),
    ...createFamilyManagement(pool, sessions, admit),
    verification: createVerification(pool, mailConfig, admit),
    recovery: createRecovery(pool, mailConfig, admit),
    ready: pool ? await createReadinessCheck(pool) : undefined,
    revision: await readRevision(),
  });
  // Idle connections can fail during a database restart without ending the HTTP process.
  pool?.on('error', () => app.log.error('Database connection unavailable'));
  app.addHook('onClose', async () => {
    await pool?.end();
  });
  if (env.VERCEL !== '1') await registerWeb(app);
  return app;
}

async function createIdentitySessions(
  pool: pg.Pool | undefined,
  config: ReturnType<typeof readConfig>,
  admit: ReturnType<typeof createAuthAdmission> | undefined,
) {
  if (!pool || !admit) return { sessions: undefined, childSessions: undefined };
  const dummyHash = await hashParentPassword(randomBytes(32).toString('base64url'));
  const sessions = createSessionService({
    repository: createSessionRepository(pool),
    admit,
    verify: verifyParentPassword,
    dummyHash,
  });
  const childSessions = config.pinPepper
    ? createChildSessionService({
        repository: createChildSessionRepository(pool),
        admit,
        material: createPinMaterial(config.pinPepper),
        verify: verifyParentPassword,
        dummyHash,
      })
    : undefined;
  return { sessions, childSessions };
}

async function registerWeb(app: ReturnType<typeof buildApp>) {
  const webRoot = fileURLToPath(new URL('../../web/dist/', import.meta.url));
  if (existsSync(webRoot)) {
    const { default: fastifyStatic } = await import('@fastify/static');
    await app.register(fastifyStatic, { root: webRoot, cacheControl: false });
    app.addHook('onSend', async (request, reply) => {
      if (reply.getHeader('Cache-Control') === undefined) {
        reply.header(
          'Cache-Control',
          request.url.startsWith('/assets/') && reply.statusCode === 200
            ? 'public, max-age=31536000, immutable'
            : 'no-cache',
        );
      }
    });
    app.setNotFoundHandler((request, reply) => {
      if (
        request.url.startsWith('/api/') ||
        request.url.startsWith('/health/') ||
        request.url.startsWith('/assets/')
      ) {
        return reply.code(404).send({ message: '没有找到这个接口' });
      }
      return reply.sendFile('index.html');
    });
  }
}

function createVerification(
  pool: pg.Pool | undefined,
  config: ReturnType<typeof readMailConfig>,
  admit: ReturnType<typeof createAuthAdmission> | undefined,
) {
  if (!pool || !config) return undefined;
  return createVerificationService({
    admit: admit!,
    repository: createVerificationRepository(pool),
    sender: createGmailSender(config, (token) => verificationEmail(config.origin, token)),
    payload: createMailPayload(config.payloadKey),
  });
}

function createRecovery(
  pool: pg.Pool | undefined,
  config: ReturnType<typeof readMailConfig>,
  admit: ReturnType<typeof createAuthAdmission> | undefined,
) {
  if (!pool || !config || !admit) return undefined;
  return createRecoveryService({
    repository: createRecoveryRepository(pool),
    admit: (work, email, source) => admit(work, email, source, 'recovery'),
    hash: hashParentPassword,
    sender: createGmailSender(config, (token) => recoveryEmail(config.origin, token)),
    payload: createMailPayload(config.payloadKey),
  });
}

function createFamilyManagement(
  pool: pg.Pool | undefined,
  sessions: ReturnType<typeof createSessionService> | undefined,
  admit: ReturnType<typeof createAuthAdmission> | undefined,
) {
  if (!pool || !sessions || !admit) return {};
  return {
    registrationKeys: createRegistrationKeyService({
      sessions,
      repository: createRegistrationKeyRepository(pool),
    }),
    reauthentication: createReauthenticationService({
      sessions,
      admit,
      repository: createReauthenticationRepository(pool),
      verify: verifyParentPassword,
    }),
  };
}

function createChildRegistration(
  pool: pg.Pool | undefined,
  config: ReturnType<typeof readConfig>,
  admit: ReturnType<typeof createAuthAdmission> | undefined,
) {
  if (!pool || !config.pinPepper || !admit) return undefined;
  return createChildRegistrationService({
    repository: createChildRegistrationRepository(pool),
    admit,
    hashPin: createChildPin(config.pinPepper),
    fingerprintKey: config.rateLimitKey!,
  });
}

function createChildAccess(
  pool: pg.Pool | undefined,
  sessions: ReturnType<typeof createSessionService> | undefined,
  admit: ReturnType<typeof createAuthAdmission> | undefined,
  config: ReturnType<typeof readConfig>,
) {
  if (!pool || !sessions || !admit || !config.pinPepper) return undefined;
  return createChildAccessService({
    sessions,
    admit,
    repository: createChildAccessRepository(pool, config.rateLimitKey!),
    replacePin: createReplacementPin(config.pinPepper),
  });
}

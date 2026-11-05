import { registerParentSessions } from './identity/routes/session.js';
import type { SessionService } from './identity/services/session.js';
import Fastify, { LogController, type FastifyError } from 'fastify';
import { Type } from '@sinclair/typebox';
import { registerCatalog } from './catalog/routes/catalog.js';
import { registerParentRegistration } from './identity/routes/registration.js';
import type { RegistrationService } from './identity/services/registration.js';
import { RequestError } from './shared/request-error.js';

export function buildApp(
  options: {
    origin?: string;
    registration?: RegistrationService;
    sessions?: SessionService;
    ready?: () => Promise<boolean>;
    revision?: string;
  } = {},
) {
  const app = Fastify({
    bodyLimit: 1_048_576,
    logController: new LogController({ disableRequestLogging: true }),
    ajv: { customOptions: { removeAdditional: false, coerceTypes: false } },
    logger: {
      redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers.set-cookie'],
    },
  });
  app.get(
    '/health/live',
    { schema: { response: { 200: Type.Object({ status: Type.Literal('ok') }) } } },
    () => ({ status: 'ok' }),
  );
  app.get('/health/ready', async (_request, reply) => {
    let ready = false;
    try {
      ready = (await options.ready?.()) === true;
    } catch {
      app.log.warn('Database readiness unavailable');
    }
    return reply
      .code(ready ? 200 : 503)
      .header('Cache-Control', 'no-store')
      .send({ status: ready ? 'ready' : 'unavailable' });
  });
  registerCatalog(app);
  app.get('/version.json', (_request, reply) =>
    reply.header('Cache-Control', 'no-store').send({ revision: options.revision ?? null }),
  );
  registerParentRegistration(app, options.origin ?? 'http://127.0.0.1:5173', options.registration);
  registerParentSessions(app, options.origin ?? 'http://127.0.0.1:5173', options.sessions);
  app.setErrorHandler<FastifyError>((error, request, reply) => {
    const invalid = error.validation !== undefined;
    const status = error instanceof RequestError ? error.statusCode : httpErrorStatus(error);
    request.log.error({ requestId: request.id, code: error.code }, 'Request failed');
    if (status === 429) reply.header('Retry-After', '60');
    void reply
      .code(status)
      .header('Cache-Control', 'no-store')
      .send({
        message:
          error instanceof RequestError
            ? error.message
            : invalid
              ? '请检查邮箱和密码格式后重试。'
              : '暂时无法完成，请稍后重试。',
      });
  });
  return app;
}

function httpErrorStatus(error: FastifyError) {
  if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500)
    return error.statusCode;
  return 503;
}

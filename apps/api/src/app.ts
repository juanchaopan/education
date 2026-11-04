import Fastify, { type FastifyError } from 'fastify';
import { Type } from '@sinclair/typebox';
import { registerCatalog } from './catalog/routes/catalog.js';

export function buildApp() {
  const app = Fastify({
    bodyLimit: 1_048_576,
    logger: {
      redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers.set-cookie'],
    },
  });
  app.get(
    '/health/live',
    { schema: { response: { 200: Type.Object({ status: Type.Literal('ok') }) } } },
    () => ({ status: 'ok' }),
  );
  registerCatalog(app);
  app.setErrorHandler<FastifyError>((error, request, reply) => {
    const invalid = error.validation !== undefined;
    request.log.error({ requestId: request.id, code: error.code }, 'Request failed');
    void reply
      .code(invalid ? 400 : 500)
      .send({ message: invalid ? '请检查输入后重试' : '暂时无法完成，请稍后重试' });
  });
  return app;
}

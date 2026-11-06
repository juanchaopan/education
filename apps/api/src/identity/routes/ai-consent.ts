import type { FastifyInstance, FastifyRequest } from 'fastify';
import { Type } from '@sinclair/typebox';
import { AiConsentChange, AiConsentView } from '@education/contracts';
import { readSessionCookie } from '../../shared/session-cookie.js';
import { sessionWriteGuard } from '../../shared/session-guard.js';
import { RequestError } from '../../shared/request-error.js';
import type { AiConsentService } from '../services/ai-consent.js';

const path = '/api/v1/parents/ai-consent';
const schema = {
  querystring: Type.Object({}, { additionalProperties: false }),
  response: { 200: AiConsentView },
};

export function registerAiConsent(
  app: FastifyInstance,
  origin: string,
  service?: AiConsentService,
) {
  const available = () => {
    if (!service) throw new RequestError(503, '暂时无法管理 AI 授权，请稍后重试。');
    return service;
  };
  app.get(path, { schema }, (request, reply) => {
    reply.header('Cache-Control', 'no-store').header('Vary', 'Cookie');
    return available().read(credentials(request));
  });
  app.post<{ Body: AiConsentChange }>(
    path,
    {
      bodyLimit: 1024,
      onRequest: sessionWriteGuard(origin),
      schema: { ...schema, body: AiConsentChange },
    },
    (request, reply) => {
      reply.header('Cache-Control', 'no-store').header('Vary', 'Cookie');
      return available().change(credentials(request), request.body);
    },
  );
}

function credentials(request: FastifyRequest) {
  return {
    token: readSessionCookie(request),
    csrf: request.headers['x-csrf-token'] as string | undefined,
  };
}

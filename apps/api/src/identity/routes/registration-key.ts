import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import {
  RegistrationKeyStatus,
  GeneratedRegistrationKey,
  RegistrationKeyRevocation,
  ParentReauthentication,
  ParentSession,
} from '@education/contracts';
import type { RegistrationKeyService } from '../services/registration-key.js';
import type { ReauthenticationService } from '../services/reauthentication.js';
import { RequestError } from '../../shared/request-error.js';
import { sessionWriteGuard } from '../../shared/session-guard.js';
import { readSessionCookie, writeSessionCookie } from '../../shared/session-cookie.js';

const empty = Type.Object({}, { additionalProperties: false });
function available<T>(service: T | undefined): T {
  if (!service) throw new RequestError(503, '家庭管理服务尚未配置，请稍后再来。');
  return service;
}
export function registerRegistrationKeys(
  app: FastifyInstance,
  origin: string,
  service?: RegistrationKeyService,
) {
  const guard = sessionWriteGuard(origin);
  app.get(
    '/api/v1/parents/registration-keys',
    {
      schema: { querystring: empty, response: { 200: RegistrationKeyStatus } },
    },
    async (request, reply) => {
      reply.header('Cache-Control', 'no-store').header('Vary', 'Cookie');
      return available(service).read(readSessionCookie(request), request.ip);
    },
  );
  app.post(
    '/api/v1/parents/registration-keys',
    {
      bodyLimit: 4096,
      onRequest: guard,
      schema: { body: empty, querystring: empty, response: { 200: GeneratedRegistrationKey } },
    },
    async (request) =>
      available(service).generate(
        readSessionCookie(request),
        request.headers['x-csrf-token'] as string | undefined,
        request.ip,
      ),
  );
  app.post<{ Body: typeof RegistrationKeyRevocation.static }>(
    '/api/v1/parents/registration-keys/revoke',
    {
      bodyLimit: 4096,
      onRequest: guard,
      schema: {
        body: RegistrationKeyRevocation,
        querystring: empty,
        response: { 204: Type.Null() },
      },
    },
    async (request, reply) => {
      await available(service).revoke(
        readSessionCookie(request),
        request.headers['x-csrf-token'] as string | undefined,
        request.body.id,
        request.ip,
      );
      return reply.code(204).send();
    },
  );
}
export function registerReauthentication(
  app: FastifyInstance,
  origin: string,
  service?: ReauthenticationService,
) {
  app.post<{ Body: typeof ParentReauthentication.static }>(
    '/api/v1/parents/reauthenticate',
    {
      bodyLimit: 4096,
      onRequest: sessionWriteGuard(origin),
      schema: {
        body: ParentReauthentication,
        querystring: empty,
        response: { 200: ParentSession },
      },
    },
    async (request, reply) => {
      const result = await available(service).confirm(
        readSessionCookie(request),
        request.headers['x-csrf-token'] as string | undefined,
        request.body.password,
        request.ip,
      );
      return reply
        .header('Set-Cookie', writeSessionCookie(result.token, result.maxAge))
        .send(result.view);
    },
  );
}

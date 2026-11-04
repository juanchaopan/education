import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { ParentRegistration, RegistrationReceipt } from '@education/contracts';
import type { RegistrationService } from '../services/registration.js';
import { RequestError } from '../../shared/request-error.js';

export function registerParentRegistration(
  app: FastifyInstance,
  origin: string,
  submit?: RegistrationService,
) {
  app.post<{ Body: ParentRegistration }>(
    '/api/v1/parents/register',
    {
      bodyLimit: 4096,
      schema: { body: ParentRegistration, response: { 202: RegistrationReceipt } },
      onRequest: async (request, reply) => {
        reply.header('Cache-Control', 'no-store');
        if (
          request.headers.origin !== origin ||
          request.headers['x-education-request'] !== 'registration' ||
          request.headers['content-type']?.split(';')[0]?.trim() !== 'application/json'
        ) {
          throw new RequestError(403, '请从本站注册页面提交。');
        }
      },
    },
    async (request, reply) => {
      if (!submit) throw new RequestError(503, '注册服务尚未配置，请稍后再来。');
      return reply.code(202).send(await submit(request.body, request.ip));
    },
  );
  app.get(
    '/api/v1/registration-status',
    {
      schema: { response: { 200: Type.Object({ enabled: Type.Boolean() }) } },
    },
    (_request, reply) => reply.header('Cache-Control', 'no-store').send({ enabled: !!submit }),
  );
}

import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { ChildRegistration, ChildRegistrationReceipt } from '@education/contracts';
import type { ChildRegistrationService } from '../services/child-registration.js';
import { RequestError } from '../../shared/request-error.js';

export function registerChildRegistration(
  app: FastifyInstance,
  origin: string,
  submit?: ChildRegistrationService,
) {
  app.post<{ Body: ChildRegistration }>(
    '/api/v1/children/register',
    {
      bodyLimit: 4096,
      schema: {
        body: ChildRegistration,
        querystring: Type.Object({}, { additionalProperties: false }),
        response: { 200: ChildRegistrationReceipt },
      },
      onRequest: async (request, reply) => {
        reply.header('Cache-Control', 'no-store');
        if (
          request.headers.origin !== origin ||
          request.headers['x-education-request'] !== 'child-registration' ||
          request.headers['content-type']?.split(';')[0]?.trim() !== 'application/json'
        )
          throw new RequestError(403, '请从本站的孩子注册页面提交。');
      },
      errorHandler: (error, _request, reply) => {
        if (typeof error === 'object' && error !== null && 'validation' in error)
          return reply
            .code(400)
            .header('Cache-Control', 'no-store')
            .send({ message: '请检查 KEY、昵称和六位数字 PIN，再试一次。' });
        throw error;
      },
    },
    async (request) => {
      if (!submit) throw new RequestError(503, '孩子注册暂时未开放，请稍后再来。');
      return submit(request.body, request.ip);
    },
  );
}

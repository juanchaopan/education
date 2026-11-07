import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { FamilyDeletionRequest, FamilyDeletionResult } from '@education/contracts';
import { readSessionCredentials, writeSessionCookie } from '../../shared/session-cookie.js';
import { sessionWriteGuard } from '../../shared/session-guard.js';
import { RequestError } from '../../shared/request-error.js';
import type { FamilyDeletionService } from '../services/family-deletion.js';

// A finished deletion clears the session cookie; a pending one keeps it, because
// the family and its sessions still exist until maintenance completes it. A
// pending deletion is logged so operators know maintenance has work to do.
export function registerFamilyDeletion(
  app: FastifyInstance,
  origin: string,
  service?: FamilyDeletionService,
) {
  app.post<{ Body: FamilyDeletionRequest }>(
    '/api/v1/parents/family-deletion',
    {
      bodyLimit: 256,
      onRequest: sessionWriteGuard(origin),
      schema: {
        querystring: Type.Object({}, { additionalProperties: false }),
        body: FamilyDeletionRequest,
        response: { 200: FamilyDeletionResult, 202: FamilyDeletionResult },
      },
    },
    async (request, reply) => {
      reply.header('Cache-Control', 'no-store').header('Vary', 'Cookie');
      if (!service) throw new RequestError(503, '暂时无法删除家庭，请稍后重试。');
      const result = await service.delete(readSessionCredentials(request), request.body);
      if (result.status === 'pending') {
        request.log.warn({ requestId: request.id }, 'Family deletion left pending');
        return reply.code(202).send(result);
      }
      return reply.header('Set-Cookie', writeSessionCookie('', 0)).send(result);
    },
  );
}

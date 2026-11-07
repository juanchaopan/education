import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { FamilyExport, FamilyExportRequest } from '@education/contracts';
import { readSessionCredentials } from '../../shared/session-cookie.js';
import { sessionWriteGuard } from '../../shared/session-guard.js';
import { RequestError } from '../../shared/request-error.js';
import type { FamilyExportService } from '../services/family-export.js';

// The response schema is the field allowlist: anything the service did not
// declare in the contract is dropped while serializing.
export function registerFamilyExport(
  app: FastifyInstance,
  origin: string,
  service?: FamilyExportService,
) {
  app.post<{ Body: FamilyExportRequest }>(
    '/api/v1/parents/family-export',
    {
      bodyLimit: 64,
      onRequest: sessionWriteGuard(origin),
      schema: {
        querystring: Type.Object({}, { additionalProperties: false }),
        body: FamilyExportRequest,
        response: { 200: FamilyExport },
      },
    },
    async (request, reply) => {
      reply.header('Cache-Control', 'no-store').header('Vary', 'Cookie');
      if (!service) throw new RequestError(503, '暂时无法导出家庭数据，请稍后重试。');
      const file = await service(readSessionCredentials(request));
      return reply
        .header('Content-Disposition', 'attachment; filename="family-data.json"')
        .send(file);
    },
  );
}

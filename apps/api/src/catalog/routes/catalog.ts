import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { CatalogResponse, ProblemParams, ProblemSummary } from '@education/contracts';
import { readSessionCredentials } from '../../shared/session-cookie.js';
import { createCatalog } from '../services/catalog.js';

type Credentials = ReturnType<typeof readSessionCredentials>;
// What else happens when someone opens a problem that exists, given the
// session the request carries.
export type ProblemOpening = (
  credentials: Credentials,
  problem: { id: string; version: number },
) => Promise<void>;

export function registerCatalog(
  app: FastifyInstance,
  catalog = createCatalog(),
  open?: ProblemOpening,
) {
  app.get('/api/v1/problems', { schema: { response: { 200: CatalogResponse } } }, catalog.list);
  app.get<{ Params: ProblemParams }>(
    '/api/v1/problems/:id/:version',
    {
      attachValidation: true,
      schema: {
        params: ProblemParams,
        response: { 200: ProblemSummary, 404: Type.Object({ message: Type.String() }) },
      },
    },
    async (request, reply) => {
      const { id, version } = request.params;
      const problem = request.validationError ? undefined : catalog.detail(id, version);
      if (!problem) return reply.code(404).send({ message: '这道题或这个版本暂时不可用。' });
      await open?.(readSessionCredentials(request), { id: problem.id, version: problem.version });
      return problem;
    },
  );
}

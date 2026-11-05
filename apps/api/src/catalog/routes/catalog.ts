import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { CatalogResponse, ProblemParams, ProblemSummary } from '@education/contracts';
import { createCatalog } from '../services/catalog.js';

export function registerCatalog(app: FastifyInstance, catalog = createCatalog()) {
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
    (request, reply) => {
      const { id, version } = request.params;
      const problem = request.validationError ? undefined : catalog.detail(id, version);
      return problem ?? reply.code(404).send({ message: '这道题或这个版本暂时不可用。' });
    },
  );
}

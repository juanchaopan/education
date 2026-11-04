import type { FastifyInstance } from 'fastify';
import { CatalogResponse } from '@education/contracts';
import { getCatalog } from '../services/catalog.js';

export function registerCatalog(app: FastifyInstance) {
  app.get('/api/v1/problems', { schema: { response: { 200: CatalogResponse } } }, getCatalog);
}

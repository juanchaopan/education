import { Type } from '@sinclair/typebox';
import {
  BookAssignment,
  ChildShelfPage,
  ChildShelfQuery,
  FamilyShelfPage,
  FamilyShelfQuery,
  PracticeBookPage,
  PracticeBookQuery,
  ShelfChild,
} from '@education/contracts';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { RequestError } from '../../shared/request-error.js';
import { readSessionCredentials } from '../../shared/session-cookie.js';
import { sessionWriteGuard } from '../../shared/session-guard.js';
import type { BookshelfService } from '../services/bookshelf.js';

const assignmentPath = '/api/v1/parents/children/:childId/assignments/:bookId';

function credentials(request: FastifyRequest, reply: FastifyReply) {
  reply.header('Cache-Control', 'no-store').header('Vary', 'Cookie');
  return readSessionCredentials(request);
}

// The parent's shelves, the child's practice, and giving a child a book or
// taking it back. Giving and taking back carry an empty body.
export function registerBookshelf(
  app: FastifyInstance,
  origin: string,
  service?: BookshelfService,
) {
  const available = () => {
    if (!service) throw new RequestError(503, '暂时无法打开书架，请稍后重试。');
    return service;
  };
  app.get<{ Querystring: FamilyShelfQuery }>(
    '/api/v1/parents/books',
    { schema: { querystring: FamilyShelfQuery, response: { 200: FamilyShelfPage } } },
    (request, reply) => available().familyShelf(credentials(request, reply), request.query),
  );
  app.get<{ Params: ShelfChild; Querystring: ChildShelfQuery }>(
    '/api/v1/parents/children/:childId/books',
    {
      schema: {
        params: ShelfChild,
        querystring: ChildShelfQuery,
        response: { 200: ChildShelfPage },
      },
    },
    (request, reply) =>
      available().childShelf(credentials(request, reply), request.params.childId, request.query),
  );
  app.get<{ Querystring: PracticeBookQuery }>(
    '/api/v1/children/assignments',
    { schema: { querystring: PracticeBookQuery, response: { 200: PracticeBookPage } } },
    (request, reply) => available().practice(credentials(request, reply), request.query.offset),
  );
  // Giving by PUT and taking back by DELETE answer alike: nothing, once done.
  for (const [method, action] of [
    ['PUT', 'assign'],
    ['DELETE', 'cancel'],
  ] as const)
    app.route<{ Params: BookAssignment }>({
      method,
      url: assignmentPath,
      bodyLimit: 1024,
      onRequest: sessionWriteGuard(origin),
      schema: {
        params: BookAssignment,
        querystring: Type.Object({}, { additionalProperties: false }),
        body: Type.Object({}, { additionalProperties: false }),
        response: { 204: Type.Null() },
      },
      handler: async (request, reply) => {
        const { childId, bookId } = request.params;
        await available()[action](credentials(request, reply), childId, bookId);
        return reply.code(204).send();
      },
    });
}

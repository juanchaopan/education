import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { FamilyTimeZone, FamilyTimeZoneChange, FamilyTimeZoneSetting } from '@education/contracts';
import { readSessionCookie, readSessionCredentials } from '../../shared/session-cookie.js';
import { sessionWriteGuard } from '../../shared/session-guard.js';
import { RequestError } from '../../shared/request-error.js';
import type { FamilyTimeZoneService } from '../services/family-time-zone.js';

const parentPath = '/api/v1/parents/family/time-zone';
const noQuery = Type.Object({}, { additionalProperties: false });

// The parent reads and changes the family's time zone; any signed-in member
// of the family reads it to show the family's day and night.
export function registerFamilyTimeZone(
  app: FastifyInstance,
  origin: string,
  service?: FamilyTimeZoneService,
) {
  const available = () => {
    if (!service) throw new RequestError(503, '暂时无法读取家庭时区，请稍后重试。');
    return service;
  };
  app.get(
    parentPath,
    { schema: { querystring: noQuery, response: { 200: FamilyTimeZoneSetting } } },
    (request, reply) => {
      reply.header('Cache-Control', 'no-store').header('Vary', 'Cookie');
      return available().read(readSessionCredentials(request));
    },
  );
  app.put<{ Body: FamilyTimeZoneChange }>(
    parentPath,
    {
      bodyLimit: 1024,
      onRequest: sessionWriteGuard(origin),
      schema: { body: FamilyTimeZoneChange, response: { 200: FamilyTimeZoneSetting } },
    },
    (request, reply) => {
      reply.header('Cache-Control', 'no-store');
      return available().change(readSessionCredentials(request), request.body);
    },
  );
  app.get(
    '/api/v1/family/time-zone',
    { schema: { querystring: noQuery, response: { 200: FamilyTimeZone } } },
    (request, reply) => {
      reply.header('Cache-Control', 'no-store').header('Vary', 'Cookie');
      return available().forSession(readSessionCookie(request));
    },
  );
}

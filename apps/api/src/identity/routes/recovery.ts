import type { FastifyInstance } from 'fastify';
import {
  RecoveryRequest,
  PasswordReset,
  RecoveryReceipt,
  PasswordResetResult,
} from '@education/contracts';
import type { RecoveryService } from '../services/recovery.js';
import { sessionWriteGuard } from './session-guard.js';
import { RequestError } from '../../shared/request-error.js';
import { writeSessionCookie } from './session-cookie.js';
export function registerRecovery(app: FastifyInstance, origin: string, recovery?: RecoveryService) {
  const configured = () => {
    if (!recovery) throw new RequestError(503, '密码恢复尚未开放，请稍后再来。');
    return recovery;
  };
  app.post<{ Body: RecoveryRequest }>(
    '/api/v1/parents/recovery',
    {
      bodyLimit: 4096,
      onRequest: sessionWriteGuard(origin),
      schema: { body: RecoveryRequest, response: { 200: RecoveryReceipt } },
    },
    async (request, reply) => {
      reply.header('Cache-Control', 'no-store');
      return configured().request(request.body, request.ip);
    },
  );
  app.post<{ Body: PasswordReset }>(
    '/api/v1/parents/recovery/confirm',
    {
      bodyLimit: 4096,
      onRequest: sessionWriteGuard(origin),
      schema: { body: PasswordReset, response: { 200: PasswordResetResult } },
    },
    async (request, reply) => {
      const result = await configured().reset(request.body, request.ip);
      reply.header('Cache-Control', 'no-store').header('Set-Cookie', writeSessionCookie('', 0));
      return result;
    },
  );
}

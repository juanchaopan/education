import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import {
  VerificationAction,
  VerificationToken,
  VerificationStatus,
  VerificationResult,
} from '@education/contracts';
import type { VerificationService } from '../services/verification.js';
import type { SessionService } from '../services/session.js';
import { csrfMatches } from '../services/session-security.js';
import { RequestError } from '../../shared/request-error.js';
import { readSessionCookie } from '../../shared/session-cookie.js';
import { sessionWriteGuard } from '../../shared/session-guard.js';

export function registerVerification(
  app: FastifyInstance,
  options: {
    origin: string;
    sessions?: SessionService;
    verification?: VerificationService;
  },
) {
  const empty = Type.Object({}, { additionalProperties: false });
  const session = async (request: Parameters<SessionService['read']>[0], source: string) => {
    if (!options.sessions) throw new RequestError(503, '账号服务尚未配置。');
    return options.sessions.read(request, source);
  };
  app.get(
    '/api/v1/parents/verification',
    {
      schema: { querystring: empty, response: { 200: VerificationStatus } },
    },
    async (request, reply) => {
      reply.header('Cache-Control', 'no-store').header('Vary', 'Cookie');
      const account = await session(readSessionCookie(request), request.ip);
      return options.verification
        ? options.verification.status(account.email)
        : {
            enabled: false,
            status: account.emailVerified ? 'verified' : 'not-sent',
            retryAfter: 0,
            canRetry: false,
          };
    },
  );
  app.post<{ Body: VerificationAction }>(
    '/api/v1/parents/verification',
    {
      bodyLimit: 4096,
      onRequest: sessionWriteGuard(options.origin),
      schema: { body: VerificationAction, response: { 200: VerificationStatus } },
    },
    async (request) => {
      const account = await session(readSessionCookie(request), request.ip);
      if (!csrfMatches(request.headers['x-csrf-token'] as string | undefined, account.csrfToken))
        throw new RequestError(403, '请刷新页面后重试。');
      const service = configured(options.verification);
      await service.send(account.email, request.body.action);
      return service.status(account.email);
    },
  );
  app.post<{ Body: VerificationToken }>(
    '/api/v1/parents/verification/confirm',
    {
      bodyLimit: 4096,
      onRequest: sessionWriteGuard(options.origin),
      schema: { body: VerificationToken, response: { 200: VerificationResult } },
    },
    async (request) => configured(options.verification).consume(request.body.token, request.ip),
  );
}

function configured(verification?: VerificationService) {
  if (!verification) throw new RequestError(503, '验证邮件尚未开放，请稍后再来。');
  return verification;
}

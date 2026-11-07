import { parseProblemVersion, type ProblemParams } from '@education/contracts';
import type { FastifyRequest } from 'fastify';
import { RequestError } from './request-error.js';
import { readSessionCredentials } from './session-cookie.js';

export function problemRequest(request: FastifyRequest<{ Params: ProblemParams }>) {
  const { id, version: raw } = request.params;
  const version = parseProblemVersion(raw);
  if (version === undefined) throw new RequestError(404, '这道题或这个版本暂时不可用。');
  return { credentials: readSessionCredentials(request), problem: { id, version } };
}

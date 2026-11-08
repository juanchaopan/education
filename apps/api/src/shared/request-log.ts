import type { FastifyInstance, FastifyRequest } from 'fastify';
import { databaseErrorCode, errorCode } from './database-error.js';

type RequestOutcome =
  | 'ok'
  | 'client-error'
  | 'rate-limited'
  | 'maintenance'
  | 'unavailable'
  | 'database'
  | 'server-error';

// What a provider call ended as: whether it was served, and why not. It never
// holds what the child sent or what the provider answered.
export type AiOutcome = { resource: string; status: string; reason?: string; source?: string };

type Note = { outcome?: RequestOutcome; code?: string; ai?: AiOutcome };
const notes = new WeakMap<FastifyRequest, Note>();

export function noteRequest(request: FastifyRequest, note: Note) {
  notes.set(request, { ...notes.get(request), ...note });
}

// Records an error the handlers did not answer themselves. A refused request
// keeps only a framework error code; a failure is a database failure when it
// carries a database code, and a server error otherwise.
export function noteError(request: FastifyRequest, error: unknown, status: number) {
  const code = errorCode(error);
  const framework = code?.startsWith('FST_') ? code : 'UNKNOWN';
  if (status < 500) return noteRequest(request, { code: framework });
  const database = databaseErrorCode(error);
  noteRequest(
    request,
    database
      ? { outcome: 'database', code: database }
      : { outcome: 'server-error', code: framework },
  );
}

function outcomeOf(status: number, note: Note | undefined): RequestOutcome {
  if (note?.outcome) return note.outcome;
  if (status === 429) return 'rate-limited';
  if (status === 503) return 'unavailable';
  if (status >= 500) return 'server-error';
  if (status >= 400) return 'client-error';
  return 'ok';
}

const levels: Record<RequestOutcome, 'info' | 'warn' | 'error'> = {
  ok: 'info',
  'client-error': 'info',
  'rate-limited': 'warn',
  maintenance: 'warn',
  unavailable: 'error',
  database: 'error',
  'server-error': 'error',
};

// Every response gets an X-Request-Id and one log line: the route pattern, never
// the raw URL with its tokens or query, the status, the time spent and the
// outcome. Headers, cookies and bodies are never logged.
export function registerRequestLog(app: FastifyInstance) {
  app.addHook('onRequest', async (request, reply) => {
    reply.header('X-Request-Id', request.id);
  });
  app.addHook('onResponse', async (request, reply) => {
    const note = notes.get(request);
    const outcome = outcomeOf(reply.statusCode, note);
    request.log[levels[outcome]](
      {
        method: request.method,
        route: request.routeOptions.url ?? null,
        status: reply.statusCode,
        durationMs: Math.round(reply.elapsedTime),
        outcome,
        code: note?.code,
        ai: note?.ai,
      },
      'Request completed',
    );
  });
}

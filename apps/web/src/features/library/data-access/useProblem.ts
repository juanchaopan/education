import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Value } from '@sinclair/typebox/value';
import {
  isProblemId,
  parseProblemVersion,
  ProblemAccessDenied,
  ProblemOpening,
  type ProblemAccessReason,
} from '@education/contracts';

// What opening a problem came to: it opened, it is not on the list, the
// server refused it for a reason, or the session had ended.
export type ProblemAnswer =
  | Readonly<{ kind: 'opened'; problem: ProblemOpening }>
  | Readonly<{ kind: 'missing' }>
  | Readonly<{ kind: 'refused'; reason: ProblemAccessReason }>
  | Readonly<{ kind: 'signed-out' }>;

async function readAnswer(response: Response): Promise<ProblemAnswer> {
  if (response.status === 400 || response.status === 404) return { kind: 'missing' };
  if (response.status === 401) return { kind: 'signed-out' };
  const body: unknown = await response.json().catch(() => undefined);
  if (response.ok && Value.Check(ProblemOpening, body)) return { kind: 'opened', problem: body };
  if (response.status === 403 && Value.Check(ProblemAccessDenied, body))
    return { kind: 'refused', reason: body.reason };
  throw new Error('暂时没能打开这道题');
}

// One problem version, opened under the signed-in session, whose token goes
// with the request. Nothing is asked before the page knows who is signed in.
export function useProblem(id: string, version: string, csrf?: string) {
  return useQuery({
    queryKey: ['problem', id, version, csrf],
    enabled: csrf !== undefined,
    queryFn: async (): Promise<ProblemAnswer> => {
      if (!isProblemId(id) || parseProblemVersion(version) === undefined)
        return { kind: 'missing' };
      const response = await fetch(
        `/api/v1/problems/${encodeURIComponent(id)}/${encodeURIComponent(version)}`,
        {
          credentials: 'same-origin',
          cache: 'no-store',
          headers: csrf ? { 'X-CSRF-Token': csrf } : {},
        },
      );
      return readAnswer(response);
    },
  });
}

// A child practising a problem has opened its book, which then stops being
// new to the child. The page says so to the server once for each problem it
// opens; a mark that does not arrive leaves the book new until next time.
export function useBookOpened(answer: ProblemAnswer | undefined, csrf?: string) {
  const practised =
    answer?.kind === 'opened' && answer.problem.mode === 'practice' ? answer.problem : undefined;
  const id = practised?.id;
  const version = practised?.version;
  useEffect(() => {
    if (id === undefined || version === undefined || !csrf) return;
    void fetch(`/api/v1/problems/${encodeURIComponent(id)}/${version}/opened`, {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrf,
        'X-Education-Request': 'session',
      },
      body: '{}',
    }).catch(() => undefined);
  }, [id, version, csrf]);
}

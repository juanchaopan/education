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

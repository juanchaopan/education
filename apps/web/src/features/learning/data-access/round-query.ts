import { queryOptions } from '@tanstack/react-query';
import type { LearningScope } from './learning-request';

// A round of the problem the child is answering, or none yet.
export type Round = Readonly<{ round: string | null }>;

// Where a part of a problem reads the round it is answered in, under its
// own name.
export type RoundSource<R extends Round = Round> = Readonly<{
  name: string;
  read: (scope: LearningScope, cancel?: AbortSignal) => Promise<R>;
}>;

// The round read once, while the part and the questions asked beside it are
// on screen, which share the one read by its name.
export function roundOptions<R extends Round>(
  { name, read }: RoundSource<R>,
  scope: LearningScope,
  enabled = true,
) {
  return queryOptions({
    queryKey: [name, scope],
    queryFn: ({ signal }) => read(scope, signal),
    retry: false,
    staleTime: Infinity,
    gcTime: 0,
    enabled,
  });
}

import { useQuery } from '@tanstack/react-query';
import { isProblemId, parseProblemVersion, type ProblemSummary } from '@education/contracts';

export function useProblem(id: string, version: string) {
  return useQuery({
    queryKey: ['problem', id, version],
    queryFn: async (): Promise<ProblemSummary | null> => {
      if (!isProblemId(id) || parseProblemVersion(version) === undefined) return null;
      const response = await fetch(
        `/api/v1/problems/${encodeURIComponent(id)}/${encodeURIComponent(version)}`,
        { credentials: 'same-origin' },
      );
      if (response.status === 400 || response.status === 404) return null;
      if (!response.ok) throw new Error('暂时没能打开这道题');
      return response.json() as Promise<ProblemSummary>;
    },
  });
}

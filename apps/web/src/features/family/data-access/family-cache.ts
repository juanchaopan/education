import type { QueryClient } from '@tanstack/react-query';
import { practiceQueryKey } from './usePractice';

export async function clearFamilyManagement(client: QueryClient) {
  const keys = [
    ['parent-registration-key'],
    ['parent-children'],
    ['parent-learning-summary'],
    practiceQueryKey,
  ];
  await Promise.all(keys.map((queryKey) => client.cancelQueries({ queryKey })));
  for (const queryKey of keys) client.removeQueries({ queryKey });
}

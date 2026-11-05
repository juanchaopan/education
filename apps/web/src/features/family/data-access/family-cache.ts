import type { QueryClient } from '@tanstack/react-query';

export async function clearFamilyManagement(client: QueryClient) {
  const keys = [['parent-registration-key'], ['parent-children']];
  await Promise.all(keys.map((queryKey) => client.cancelQueries({ queryKey })));
  for (const queryKey of keys) client.removeQueries({ queryKey });
}

import type { QueryClient } from '@tanstack/react-query';
import type { ParentSession } from '@education/contracts';
import { bookshelfQueryKey } from './useBookshelf';

export async function clearFamilyManagement(client: QueryClient) {
  const keys = [
    ['parent-registration-key'],
    ['parent-children'],
    ['parent-learning-summary'],
    ['parent-ai-consent'],
    bookshelfQueryKey,
  ];
  await Promise.all(keys.map((queryKey) => client.cancelQueries({ queryKey })));
  for (const queryKey of keys) client.removeQueries({ queryKey });
}

// Signs the parent space into a new session, or out with null. Every cached
// family view belongs to the old session. Signing in drops them before the new
// session mounts panels that fetch under it; signing out unmounts the panels
// first, so none of them refetch under the session that just ended.
export async function replaceParentSession(client: QueryClient, session: ParentSession | null) {
  await client.cancelQueries({ queryKey: ['parent-session'] });
  if (session) await clearFamilyManagement(client);
  client.setQueryData(['parent-session'], session);
  if (!session) await clearFamilyManagement(client);
}

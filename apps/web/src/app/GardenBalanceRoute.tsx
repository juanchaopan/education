import { useChildSession } from '../features/family/data-access/useChildSession';
import { GardenBalanceLesson } from '../features/learning/pages/GardenBalanceLesson';
import { EmptyState } from '../shared/ui/EmptyState';

// A lesson needs to know whether a child is signed in before it starts, so a
// child's saved place and answers are never mixed with a visitor's.
export function GardenBalanceRoute() {
  const session = useChildSession();
  if (session.isPending)
    return <EmptyState icon="◌" title="正在打开这道题" description="请稍等一下。" />;
  return <GardenBalanceLesson csrf={session.data?.csrfToken} />;
}

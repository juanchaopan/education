import { Suspense, type ComponentType } from 'react';
import { useChildSession } from '../features/family/data-access/useChildSession';
import { EmptyState } from '../shared/ui/EmptyState';

// A lesson page receives the signed-in child's session token, or nothing for
// a visitor.
export type LessonPage = ComponentType<{ csrf?: string }>;

const opening = <EmptyState icon="waiting" title="正在打开这道题" description="请稍等一下。" />;

// A lesson needs to know whether a child is signed in before it starts, so a
// child's saved place and answers are never mixed with a visitor's. Lessons
// are loaded only when opened, so the catalog never carries their scenes.
export function LessonRoute({ lesson: Lesson }: { lesson: LessonPage }) {
  const session = useChildSession();
  if (session.isPending) return opening;
  return (
    <Suspense fallback={opening}>
      <Lesson csrf={session.data?.csrfToken} />
    </Suspense>
  );
}

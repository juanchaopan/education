import { Suspense, type ComponentType } from 'react';
import { useChildSession } from '../features/family/data-access/useChildSession';
import { EmptyState } from '../shared/ui/EmptyState';
import { LessonBoundary } from './LessonBoundary';
import { useReleaseCheck } from './release/useReleaseUpdate';

// A lesson page receives the signed-in child's session token, or nothing for
// a visitor.
export type LessonPage = ComponentType<{ csrf?: string }>;

const opening = <EmptyState icon="waiting" title="正在打开这道题" description="请稍等一下。" />;

// A lesson that could not go on, most often because its files went with a
// new release. The deployment is checked at once, and the child can open the
// lesson again: a full reload, which only the child starts, so it never
// repeats on its own.
const unopened = (
  <EmptyState
    icon="cloud"
    title="这道题暂时打不开"
    description="网站可能刚更新过，点一下重新打开。"
    actionLabel="重新打开"
    onAction={() => window.location.reload()}
  />
);

// A lesson needs to know whether a child is signed in before it starts, so a
// child's saved place and answers are never mixed with a visitor's. Lessons
// are loaded only when opened, so the catalog never carries their scenes.
export function LessonRoute({ lesson: Lesson }: { lesson: LessonPage }) {
  const session = useChildSession();
  const checkRelease = useReleaseCheck();
  if (session.isPending) return opening;
  return (
    <LessonBoundary fallback={unopened} onFailure={checkRelease}>
      <Suspense fallback={opening}>
        <Lesson csrf={session.data?.csrfToken} />
      </Suspense>
    </LessonBoundary>
  );
}

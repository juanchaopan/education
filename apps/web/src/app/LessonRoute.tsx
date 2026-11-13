import { Suspense, type ComponentType } from 'react';
import { EmptyState } from '../shared/ui/EmptyState';
import { LessonBoundary } from './LessonBoundary';
import { useReleaseCheck } from './release/useReleaseUpdate';

// One lesson as the route shows it, loaded when opened: it receives the
// signed-in child's session token, or nothing for someone only watching.
export type LessonScreen = ComponentType<{ csrf?: string }>;

const opening = <EmptyState icon="clock" title="正在打开这道题" description="请稍等一下。" />;

// A lesson that could not go on, most often because its files went with a
// new release. The deployment is checked at once, and the child can open the
// lesson again: a full reload, which only the child starts, so it never
// repeats on its own.
const unopened = (
  <EmptyState
    icon="alert"
    title="这道题暂时打不开"
    description="网站可能刚更新过，点一下重新打开。"
    actionLabel="重新打开"
    onAction={() => window.location.reload()}
  />
);

// Lessons are loaded only when opened, so the home page never carries their
// scenes. The child's session token, when there is one, keeps the child's
// place and answers.
export function LessonRoute({ lesson: Lesson, csrf }: { lesson: LessonScreen; csrf?: string }) {
  const checkRelease = useReleaseCheck();
  return (
    <LessonBoundary fallback={unopened} onFailure={checkRelease}>
      <Suspense fallback={opening}>
        <Lesson csrf={csrf} />
      </Suspense>
    </LessonBoundary>
  );
}

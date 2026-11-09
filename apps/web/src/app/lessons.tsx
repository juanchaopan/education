import { lazy } from 'react';

// Each lesson, its definition shown on the shared lesson page, both loaded
// when a child opens it.
export const GardenBalanceLesson = lazy(async () => {
  const [{ LessonPage }, { gardenLesson }] = await Promise.all([
    import('../features/learning/pages/LessonPage'),
    import('../features/learning/lessons/garden-balance/definition'),
  ]);
  return {
    default: ({ csrf }: { csrf?: string }) => <LessonPage lesson={gardenLesson} csrf={csrf} />,
  };
});

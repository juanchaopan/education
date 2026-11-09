import { lazy } from 'react';

// Each lesson's page, built for its definition on the shared lesson page, both
// loaded when a child opens it.
export const GardenBalanceLesson = lazy(async () => {
  const [{ lessonPage }, { gardenLesson }] = await Promise.all([
    import('../features/learning/pages/LessonPage'),
    import('../features/learning/lessons/garden-balance/definition'),
  ]);
  return { default: lessonPage(gardenLesson) };
});

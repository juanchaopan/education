import { lazy } from 'react';
import { lessons } from '../features/learning/lessons/registry';
import type { ProblemPages } from '../features/library/pages/ProblemPage';
import { problemPath } from '../shared/lib/problem-path';
import { LessonRoute } from './LessonRoute';

// Every registered problem version and the page that teaches it, by
// problemPath. Each lesson's page is loaded when it is opened.
export const lessonPages: ProblemPages = new Map(
  lessons.map(({ problem, page }) => {
    const screen = lazy(async () => ({ default: await page() }));
    return [
      problemPath(problem.id, problem.version),
      (_problem, csrf) => <LessonRoute lesson={screen} csrf={csrf} />,
    ];
  }),
);

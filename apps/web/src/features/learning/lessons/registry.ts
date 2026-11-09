import type { ComponentType } from 'react';
import type { FilmLine, FilmState } from '../interaction/lesson-film';
import type { LessonDefinition } from './lesson-definition';

type Problem = Readonly<{ id: string; version: number }>;

// What the checks read of a lesson's definition: its version, its lines,
// scenes and entry lines, and its answer scene and hints. Every lesson's
// definition is one, whatever its own types.
export type LessonOutline = Readonly<{
  problem: Problem;
  script: Readonly<{
    lines: Readonly<Record<string, FilmLine>>;
    shots: readonly string[];
    entryLines: Readonly<Record<string, readonly string[]>>;
  }>;
  answer: Readonly<{ shot: string; hints: readonly string[] }>;
}>;

// A maintained problem version, its lesson's definition and the lesson's
// page, both loaded only when asked for.
export type LessonEntry = Readonly<{
  problem: Problem;
  definition: () => Promise<LessonOutline>;
  page: () => Promise<ComponentType<{ csrf?: string }>>;
}>;

// One registry line: the shared page is built for the lesson's own
// definition, and loaded with it when a child opens the lesson.
function lesson<
  State extends FilmState<Shot>,
  Shot extends string,
  Line extends string,
  Move,
  Piece extends string,
  Look extends object,
>(
  problem: Problem,
  definition: () => Promise<LessonDefinition<State, Shot, Line, Move, Piece, Look>>,
): LessonEntry {
  return {
    problem,
    definition,
    async page() {
      const [{ lessonPage }, loaded] = await Promise.all([
        import('../pages/LessonPage'),
        definition(),
      ]);
      return lessonPage(loaded);
    },
  };
}

// Every lesson, one line each. A lesson's code is loaded only when a child
// opens it, so the library never carries any lesson's scenes.
export const lessons: readonly LessonEntry[] = [
  lesson(
    { id: 'garden-balance', version: 1 },
    async () => (await import('./garden-balance/definition')).gardenLesson,
  ),
];

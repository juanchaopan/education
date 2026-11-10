import type { ComponentType } from 'react';
import type { Box } from '../components/lesson-stage/stage-look';
import type { FilmState } from '../interaction/lesson-film';
import type { BackdropId } from '../media/backdrops/backdrops';
import type {
  LessonAnswer,
  LessonDefinition,
  ProblemVersion,
  Script,
  TeacherRole,
} from './lesson-definition';

// What the checks read of a lesson's definition: its version, its lines,
// scenes, entry lines and each scene's framing, its answer scene and hints,
// the library backdrop and teacher it picks, and where its props stand.
// Every lesson's definition is one, whatever its own types.
export type LessonOutline = Readonly<{
  problem: ProblemVersion;
  script: Pick<Script<string, string>, 'lines' | 'shots' | 'entryLines' | 'cameras'>;
  answer: Pick<LessonAnswer<string>, 'shot' | 'hints'>;
  backdrop: BackdropId;
  teacher: Pick<TeacherRole, 'id'>;
  staging: Box;
}>;

// A maintained problem version, its lesson's definition and the lesson's
// page, both loaded only when asked for.
export type LessonEntry = Readonly<{
  problem: ProblemVersion;
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
  problem: ProblemVersion,
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

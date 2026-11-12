import type { ScenePicture } from '@education/contracts';
import type { AnyLessonContent } from '@education/problems/lesson-content';
import type { ComponentType } from 'react';
import type { Box } from '../components/lesson-stage/stage-look';
import type { FilmState } from '../interaction/lesson-film';
import type { LessonBoard } from './lesson-board';
import type {
  LessonAnswer,
  LessonDefinition,
  ProblemVersion,
  Script,
  TeacherRole,
} from './lesson-definition';

// What the checks read of a lesson's definition: its content, with its
// version, flow, backdrop, scenes, answer scene, lines, conclusions and
// record words; its script's lines, scenes, entry lines and each scene's
// framing; its answer's hints; the library teacher it picks; where its props
// stand; how its board draws the conclusions; and the picture each scene
// first shows, as a question would carry it. Every lesson's definition gives
// one, whatever its own types.
export type LessonOutline = Readonly<{
  content: AnyLessonContent;
  script: Pick<Script<string, string>, 'lines' | 'shots' | 'entryLines' | 'cameras'>;
  answer: Pick<LessonAnswer, 'hints'>;
  teacher: Pick<TeacherRole, 'id'>;
  staging: Box;
  board?: LessonBoard<never, string>;
  pictures: Readonly<Record<string, ScenePicture>>;
}>;

// A lesson's definition as the checks read it.
export function lessonOutline<
  State extends FilmState<Shot>,
  Shot extends string,
  Line extends string,
  Move,
  Piece extends string,
  Look extends object,
>(lesson: LessonDefinition<State, Shot, Line, Move, Piece, Look>): LessonOutline {
  const { script, story, record } = lesson;
  const pictures = Object.fromEntries(
    script.shots.map((shot) => [shot, record.picture(story.arrive(shot).state)]),
  );
  return { ...lesson, pictures };
}

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
    definition: async () => lessonOutline(await definition()),
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

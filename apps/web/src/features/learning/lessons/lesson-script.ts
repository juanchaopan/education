import type { LessonContent } from '@education/problems/lesson-content';
import type { FilmLine } from '../interaction/lesson-film';

// A lesson's script, read from its content and its recordings: each line's
// words as the content declares them with the recording made from them, the
// scenes in teaching order, and the lines each scene says on arriving. A
// lesson's `script.ts` builds its script with this, so the narration tool,
// which loads that file in Node, reads the same lines the lesson plays; the
// file and what it imports are plain TypeScript, without JSX or the
// bundler's imports.
export function narratedScript<Shot extends string, Line extends string>(
  { shots, lines, scenes }: Pick<LessonContent<Shot, Line, string>, 'shots' | 'lines' | 'scenes'>,
  clips: Readonly<Record<Line, string>>,
) {
  const ids = Object.keys(lines) as Line[];
  return {
    lines: Object.fromEntries(
      ids.map((id) => [id, { text: lines[id].text, clip: clips[id] }]),
    ) as Readonly<Record<Line, FilmLine>>,
    shots,
    entryLines: Object.fromEntries(shots.map((shot) => [shot, scenes[shot].entry])) as Readonly<
      Record<Shot, readonly Line[]>
    >,
  };
}

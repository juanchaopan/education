import type { LessonRecord, ScenePicture } from '@education/contracts';
import { backdropScenery } from '@education/problems/backdrops';
import {
  declaresAction,
  inVariation,
  pictureProblems,
  type AnyLessonContent,
  type AnyRecordWords,
} from '@education/problems/lesson-content';

// One scene as the teacher is told it: its place in the lesson, the author's
// description of it, what the teacher said in it, and its picture, when the
// page saw it.
export type SceneMaterial = Readonly<{
  scene: number;
  step: string;
  said: readonly string[];
  picture?: string;
}>;

// The lesson so far, as a model may see it when a child asks a question: the
// earlier scenes, the scene asked about, the conclusions found before it, the
// child's key actions and the backdrop's scenery. In the variation, which is
// another problem, `found` holds the problem's conclusions and `variation`
// the variation's own conditions and result. Nothing of a later scene is in
// it, and the final answer only once the lesson is past the scene that asks
// for it.
export type LessonMaterial = Readonly<{
  earlier: readonly SceneMaterial[];
  now: SceneMaterial;
  found: readonly string[];
  variation?: readonly string[];
  done: readonly string[];
  scenery: string;
}>;

// The earlier pictures are of scenes before the one asked about, in teaching
// order, each once.
function endedProblems({ shots }: AnyLessonContent, at: number, record: LessonRecord) {
  let last = -1;
  return record.ended.flatMap(({ stepId }) => {
    const index = shots.indexOf(stepId);
    const fits = index > last && index < at;
    last = Math.max(last, index);
    return fits ? [] : [`ended scene ${stepId} is out of place`];
  });
}

// What is wrong with the page's record of a lesson asked about in the scene at
// `at`: ids the lesson does not declare, earlier pictures of scenes that are
// not before it or out of order, and actions in later scenes.
function recordProblems(content: AnyLessonContent, at: number, record: LessonRecord) {
  const pictures = [record.now, ...record.ended.map(({ picture }) => picture)];
  return [
    ...pictures.flatMap((picture) => pictureProblems(content, picture)),
    ...endedProblems(content, at, record),
    ...record.actions
      .filter(({ stepId, action }) => {
        const index = content.shots.indexOf(stepId);
        return index < 0 || index > at || !declaresAction(content, action);
      })
      .map(({ stepId, action }) => `action ${action} in ${stepId} is out of place`),
  ];
}

// A picture told in the lesson's words: each place with what lies there, or
// 空的, then how the picture stands, for example
// 天平左盘（画面左边）：1 棵青菜；天平右盘（画面右边）：6 个苹果。苹果这边沉下去了。
export function pictureText({ places, things, states }: AnyRecordWords, picture: ScenePicture) {
  const byPlace = new Map<string, string[]>();
  for (const { place, thing, count } of picture.things) {
    const items = byPlace.get(place) ?? [];
    const { name, unit } = things[thing] ?? { name: thing, unit: '' };
    if (count > 0) items.push(`${count} ${unit}${name}`);
    byPlace.set(place, items);
  }
  const placed = [...byPlace].map(
    ([place, items]) => `${places[place]}：${items.length ? items.join('、') : '空的'}`,
  );
  const standing = picture.states.map((state) => states[state]);
  return [placed.join('；'), standing.join('，')].filter(Boolean).join('。') + '。';
}

// A scene of the lesson as the teacher is told it.
function sceneMaterial(
  content: AnyLessonContent,
  index: number,
  said: readonly string[],
  picture?: ScenePicture,
): SceneMaterial {
  const shot = content.shots[index] ?? '';
  return {
    scene: index + 1,
    step: content.scenes[shot]?.prompt ?? '',
    said,
    ...(picture && { picture: pictureText(content.recordWords, picture) }),
  };
}

// Everything the teacher said in a scene, in the order it is said.
const allSaid = ({ lines }: AnyLessonContent, shot: string) =>
  Object.values(lines)
    .filter(({ scene }) => scene === shot)
    .map(({ text }) => text);

// What the teacher says on arriving at a scene.
const entrySaid = ({ scenes, lines }: AnyLessonContent, shot: string) =>
  (scenes[shot]?.entry ?? []).map((line) => lines[line]?.text ?? '');

// The conclusions told for a question in the scene at `at`, the final answer
// written on only past the scene that asks for it: those found before it,
// or, in the variation, the problem's conclusions apart from the variation's
// own conditions and result, each from the scene that says it on arriving.
function conclusionsAt(content: AnyLessonContent, at: number) {
  const { shots, answerScene, conclusions } = content;
  const answered = at > shots.indexOf(answerScene);
  const told = ({ says, answer }: AnyLessonContent['conclusions'][number]) =>
    answered && answer ? answer.says : says;
  const before = conclusions.filter(({ from }) => shots.indexOf(from) < at);
  if (!inVariation(content, shots[at] ?? '')) return { found: before.map(told) };
  const varied = ({ from }: { from: string }) => inVariation(content, from);
  return {
    found: before.filter((conclusion) => !varied(conclusion)).map(told),
    variation: conclusions
      .filter((conclusion) => varied(conclusion) && shots.indexOf(conclusion.from) <= at)
      .map(told),
  };
}

// The child's key actions in the lesson's words, each with its scene.
function done({ shots, recordWords }: AnyLessonContent, record: LessonRecord) {
  return record.actions.map(({ stepId, action, times }) => {
    const repeated = times > 1 ? `（${times} 次）` : '';
    return `第 ${shots.indexOf(stepId) + 1} 幕：${recordWords.actions[action]}${repeated}`;
  });
}

// The lesson so far for a question asked in `stepId`, from the lesson's own
// content and the page's record, or nothing when the record does not fit the
// lesson. A scene after the one that asks for the final answer is told only
// when `answered`, the server's own record that the child has answered the
// problem version right: the page alone cannot vouch that the child got
// there. The scene asked about gets only its entry lines: what was said after
// them follows the child's actions, which its picture and the action log
// already show.
export function lessonMaterial(
  content: AnyLessonContent,
  stepId: string,
  record: LessonRecord,
  answered: boolean,
): LessonMaterial | undefined {
  const at = content.shots.indexOf(stepId);
  const past = at > content.shots.indexOf(content.answerScene);
  if (at < 0 || (past && !answered) || recordProblems(content, at, record).length > 0) return;
  const pictures = new Map(record.ended.map(({ stepId: shot, picture }) => [shot, picture]));
  const earlier = content.shots
    .slice(0, at)
    .map((shot, index) =>
      sceneMaterial(content, index, allSaid(content, shot), pictures.get(shot)),
    );
  return {
    earlier,
    now: sceneMaterial(content, at, entrySaid(content, stepId), record.now),
    ...conclusionsAt(content, at),
    done: done(content, record),
    scenery: backdropScenery[content.backdrop],
  };
}

// The lesson so far within `maxLength` characters of its JSON. A long lesson
// tells its oldest earlier scenes more briefly, one at a time, until the
// record fits: first only what each scene was for, without what was said and
// its picture, then not at all, while the newer scenes, the conclusions
// found and the child's actions still carry what came before. Nothing fits
// when the scene asked about, the conclusions and the actions alone are too
// long.
export function withinLength(
  material: LessonMaterial,
  maxLength: number,
): LessonMaterial | undefined {
  const fits = (earlier: readonly SceneMaterial[]) =>
    JSON.stringify({ ...material, earlier }).length <= maxLength;
  const earlier = [...material.earlier];
  for (let at = 0; at < earlier.length && !fits(earlier); at += 1) {
    const { scene, step } = earlier[at]!;
    earlier[at] = { scene, step, said: [] };
  }
  while (earlier.length > 0 && !fits(earlier)) earlier.shift();
  return fits(earlier) ? { ...material, earlier } : undefined;
}

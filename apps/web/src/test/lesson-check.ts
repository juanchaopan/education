import { inside } from '../features/learning/components/lesson-stage/stage-look';
import { shotAfter, type ProblemVersion } from '../features/learning/lessons/lesson-definition';
import type { LessonOutline } from '../features/learning/lessons/registry';
import { backdrops } from '../features/learning/media/backdrops/backdrops';

// What a lesson must agree with in the plugin the server keeps for its
// problem version: the steps a model may see and the authored hints.
export type PluginOutline = Readonly<{ steps: readonly string[]; hints: readonly string[] }>;

// A problem version as the checks name it.
export const versionName = ({ id, version }: ProblemVersion) => `${id}/${version}`;

const missing = (from: readonly string[], within: readonly string[]) =>
  from.filter((name) => !within.includes(name));

function versionProblems(listed: ProblemVersion, lesson: LessonOutline) {
  const [registered, own] = [versionName(listed), versionName(lesson.problem)];
  return own === registered ? [] : [`registered as ${registered} but defined as ${own}`];
}

function scriptProblems({ script }: LessonOutline) {
  const { lines, shots, entryLines } = script;
  const unrecorded = Object.entries(lines).filter(([, { clip }]) => !clip.trim());
  const silent = shots.filter((shot) => !entryLines[shot]?.length);
  const unknown = shots.flatMap((shot) => missing(entryLines[shot] ?? [], Object.keys(lines)));
  return [
    ...unrecorded.map(([line]) => `line ${line} has no recording`),
    ...silent.map((shot) => `scene ${shot} has no entry lines`),
    ...unknown.map((line) => `entry line ${line} is not in the script`),
  ];
}

// The count is asked in one of the lesson's scenes, and a correct count plays
// on into the scene after it.
function answerProblems({ script, answer }: LessonOutline) {
  const { shot } = answer;
  if (!script.shots.includes(shot)) return [`answer scene ${shot} is not a scene`];
  return shotAfter(script, shot) ? [] : [`answer scene ${shot} has no scene after it`];
}

// The lesson's props stand in its backdrop's clearing. Its backdrop and
// teacher are library ids by type, so a lesson naming any other does not
// compile.
function stagingProblems({ backdrop, staging }: LessonOutline) {
  return inside(staging, backdrops[backdrop].clearZone)
    ? []
    : [`the props stand outside the clearing of ${backdrop}`];
}

function pluginProblems(listed: ProblemVersion, lesson: LessonOutline, plugin?: PluginOutline) {
  if (!plugin) return [`the server has no plugin for ${versionName(listed)}`];
  const { script, answer } = lesson;
  return [
    ...missing(script.shots, plugin.steps).map((shot) => `scene ${shot} is not a plugin step`),
    ...missing(plugin.steps, script.shots).map((step) => `plugin step ${step} is not a scene`),
    ...missing(answer.hints, plugin.hints).map((hint) => `hint ${hint} is not in the plugin`),
  ];
}

// Everything wrong with a registered lesson, or nothing: its version against
// its registry line, its recordings and entry lines, its answer scene and the
// scene after it, where its props stand against its backdrop, and the
// server's plugin for it, with its steps and hints.
export function lessonProblems(
  listed: ProblemVersion,
  lesson: LessonOutline,
  plugin?: PluginOutline,
) {
  return [
    ...versionProblems(listed, lesson),
    ...scriptProblems(lesson),
    ...answerProblems(lesson),
    ...stagingProblems(lesson),
    ...pluginProblems(listed, lesson, plugin),
  ];
}

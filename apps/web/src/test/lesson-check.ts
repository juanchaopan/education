import { shotAfter } from '../features/learning/lessons/lesson-definition';
import type { LessonOutline } from '../features/learning/lessons/registry';

type Problem = LessonOutline['problem'];

// What a lesson must agree with in the plugin the server keeps for its
// problem version: the steps a model may see and the authored hints.
export type PluginOutline = Readonly<{ steps: readonly string[]; hints: readonly string[] }>;

const missing = (from: readonly string[], within: readonly string[]) =>
  from.filter((name) => !within.includes(name));

function versionProblems(listed: Problem, lesson: LessonOutline, plugin?: PluginOutline) {
  const registered = `${listed.id}/${listed.version}`;
  const own = `${lesson.problem.id}/${lesson.problem.version}`;
  return [
    ...(plugin ? [] : [`the server has no plugin for ${registered}`]),
    ...(own === registered ? [] : [`registered as ${registered} but defined as ${own}`]),
  ];
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

function pluginProblems({ script, answer }: LessonOutline, plugin?: PluginOutline) {
  if (!plugin) return [];
  return [
    ...missing(script.shots, plugin.steps).map((shot) => `scene ${shot} is not a plugin step`),
    ...missing(plugin.steps, script.shots).map((step) => `plugin step ${step} is not a scene`),
    ...missing(answer.hints, plugin.hints).map((hint) => `hint ${hint} is not in the plugin`),
  ];
}

// Everything wrong with a registered lesson, or nothing: its version against
// its registry line and the server's plugins, its recordings and entry lines,
// its answer scene and the scene after it, and its scenes and hints against
// the plugin's steps and hints.
export function lessonProblems(listed: Problem, lesson: LessonOutline, plugin?: PluginOutline) {
  return [
    ...versionProblems(listed, lesson, plugin),
    ...scriptProblems(lesson),
    ...answerProblems(lesson),
    ...pluginProblems(lesson, plugin),
  ];
}

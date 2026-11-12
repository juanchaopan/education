import { lessonContentProblems, type AnyLessonContent } from '@education/problems/lesson-content';
import {
  boardReach,
  establishing,
  framed,
  inside,
} from '../features/learning/components/lesson-stage/stage-look';
import type { ProblemVersion } from '../features/learning/lessons/lesson-definition';
import type { LessonOutline } from '../features/learning/lessons/registry';
import { backdrops } from '../features/learning/media/backdrops/backdrops';

// What a lesson must agree with in the plugin the server keeps for its
// problem version: the steps a model may see and the authored hints.
export type PluginOutline = Readonly<{ steps: readonly string[]; hints: readonly string[] }>;

// The parts of a problem plugin the outline is read from. The plugins live in
// @education/problems/server, which only tests may load, so the check names
// just the shape it reads.
type PluginParts = Readonly<{
  feedback?: Readonly<Record<string, unknown>>;
  answering?: Readonly<{ hints?: Readonly<Record<string, unknown>> }>;
}>;

// A plugin's steps and hints, or nothing when the server has no plugin.
export function pluginOutline(plugin?: PluginParts): PluginOutline | undefined {
  return (
    plugin && {
      steps: Object.keys(plugin.feedback ?? {}),
      hints: Object.keys(plugin.answering?.hints ?? {}),
    }
  );
}

// What a lesson's narration record, `assets/narration.json`, says its
// recordings were made in and from: the voice, and the words by each
// recording's file name. The narration tool writes it as it records
// (scripts/lesson-narration.mjs).
export type NarrationRecord = Readonly<{
  voice: Readonly<Record<string, unknown>>;
  recordings: Readonly<Record<string, string>>;
}>;

// The narration voice scripts/lesson-voice.json names: the engine, and the
// engine's settings under its name.
export type VoiceConfig = Readonly<{ engine: string }> & Readonly<Record<string, unknown>>;

// A problem version as the checks name it.
export const versionName = ({ id, version }: ProblemVersion) => `${id}/${version}`;

const missing = (from: readonly string[], within: readonly string[]) =>
  from.filter((name) => !within.includes(name));

const same = (one: readonly string[], other: readonly string[]) =>
  one.length === other.length && one.every((name, index) => other[index] === name);

function versionProblems(listed: ProblemVersion, { content }: LessonOutline) {
  const [registered, own] = [versionName(listed), versionName(content.problem)];
  return own === registered ? [] : [`registered as ${registered} but defined as ${own}`];
}

// The script plays the content's lines, scenes and entry lines, each line
// with a recording of its own.
function scriptProblems({ script, content }: LessonOutline) {
  const { lines, shots, entryLines } = script;
  const unrecorded = Object.entries(lines).filter(([, { clip }]) => !clip.trim());
  const [played, declared] = [Object.keys(lines), Object.keys(content.lines)];
  const reworded = declared.filter(
    (line) => lines[line] && lines[line].text !== content.lines[line]?.text,
  );
  const reentered = shots.filter(
    (shot) => !same(entryLines[shot] ?? [], content.scenes[shot]?.entry ?? []),
  );
  return [
    ...unrecorded.map(([line]) => `line ${line} has no recording`),
    ...(same(shots, content.shots) ? [] : ["the script's scenes are not the content's scenes"]),
    ...missing(played, declared).map((line) => `script line ${line} is not in the content`),
    ...missing(declared, played).map((line) => `content line ${line} is not in the script`),
    ...reworded.map((line) => `script line ${line} says other words than the content`),
    ...reentered.map((shot) => `the script's entry lines of ${shot} are not the content's`),
  ];
}

// The lesson's props stand in its backdrop's clearing in every scene, as that
// scene frames the backdrop; the props stay put while the backdrop zooms and
// moves. Its backdrop and teacher are library ids by type, so a lesson naming
// any other does not compile.
function stagingProblems({ backdrop, staging, script }: LessonOutline) {
  const { clearZone } = backdrops[backdrop];
  return script.shots
    .filter((shot) => !inside(staging, framed(clearZone, script.cameras?.[shot] ?? establishing)))
    .map((shot) => `the props stand outside the clearing of ${backdrop} in scene ${shot}`);
}

type AnyConclusion = AnyLessonContent['conclusions'][number];

// A conclusion is lit only by hints the answer gives, and one the answer's
// hints light or the count is written on is found by the scene that asks for
// the count.
function answeringProblems(
  { id, from, hints = [], answer }: AnyConclusion,
  { content, answer: count }: LessonOutline,
) {
  const { shots, answerScene } = content;
  const late = shots.indexOf(from) > shots.indexOf(answerScene);
  return [
    ...missing(hints, count.hints).map(
      (hint) => `conclusion ${id} is lit by hint ${hint}, which the answer does not give`,
    ),
    ...(late && (hints.length > 0 || answer)
      ? [`conclusion ${id} first shows after the count is asked, so the answer never reaches it`]
      : []),
  ];
}

// A board draws every conclusion with pictures it has, says when only
// conclusions there are count as found, and leaves the props below it along
// the top of a wide picture.
function boardProblems({ board, content, staging }: LessonOutline) {
  if (!board) return [];
  const pictures = Object.keys(board.pictures);
  const ids = content.conclusions.map(({ id }) => id);
  return [
    ...content.conclusions.flatMap(({ id, amounts, answer }) =>
      missing(
        [...amounts, ...(answer ? [answer.amount] : [])].map(([, picture]) => picture),
        pictures,
      ).map((picture) => `conclusion ${id} draws ${picture}, which has no picture`),
    ),
    ...missing(Object.keys(board.found ?? {}), ids).map(
      (id) => `the board says when ${id} is found, which is not a conclusion`,
    ),
    ...(staging.y < boardReach ? ['the props reach up under the conclusion board'] : []),
  ];
}

// The conclusions agree with the answer whether or not a board shows them.
function conclusionProblems(lesson: LessonOutline) {
  return lesson.content.conclusions.flatMap((conclusion) => answeringProblems(conclusion, lesson));
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
// its registry line, its content, with what its lesson flow asks of it, its
// script and recordings against the content, where its props stand against
// its backdrop in each scene, its conclusions and their board, and the
// server's plugin for it, with its steps and hints.
export function lessonProblems(
  listed: ProblemVersion,
  lesson: LessonOutline,
  plugin?: PluginOutline,
) {
  return [
    ...versionProblems(listed, lesson),
    ...lessonContentProblems(lesson.content),
    ...scriptProblems(lesson),
    ...stagingProblems(lesson),
    ...conclusionProblems(lesson),
    ...boardProblems(lesson),
    ...pluginProblems(listed, lesson, plugin),
  ];
}

const fileName = (clip: string) => clip.slice(clip.lastIndexOf('/') + 1);

// Every line's recording was made from the words the line shows, in the voice
// the configuration names: a line edited without being recorded again, a line
// recorded by hand without the tool, or a voice changed in lesson-voice.json
// without recording the lesson again is found here.
export function narrationProblems(
  { script }: LessonOutline,
  config: VoiceConfig,
  record?: NarrationRecord,
) {
  if (!record) return ['the lesson has no narration record'];
  const configured: Readonly<Record<string, unknown>> = {
    engine: config.engine,
    ...(config[config.engine] as object),
  };
  const otherVoice = Object.keys(record.voice).filter(
    (key) => record.voice[key] !== configured[key],
  );
  return [
    ...otherVoice.map(
      (key) => `the lesson was recorded with another ${key} than lesson-voice.json`,
    ),
    ...Object.entries(script.lines)
      .filter(([, { text, clip }]) => record.recordings[fileName(clip)] !== text)
      .map(([line]) => `line ${line} was not recorded from its words`),
  ];
}

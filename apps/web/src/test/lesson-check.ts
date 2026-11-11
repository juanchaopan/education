import {
  establishing,
  framed,
  inside,
} from '../features/learning/components/lesson-stage/stage-look';
import { shotAfter, type ProblemVersion } from '../features/learning/lessons/lesson-definition';
import type { LessonOutline } from '../features/learning/lessons/registry';
import { backdrops } from '../features/learning/media/backdrops/backdrops';

// What a lesson must agree with in the plugin the server keeps for its
// problem version: the steps a model may see and the authored hints.
export type PluginOutline = Readonly<{ steps: readonly string[]; hints: readonly string[] }>;

// The parts of a problem plugin the outline is read from. The plugins live in
// @education/problems, which only tests may load, so the check names just
// the shape it reads.
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
// scene after it, where its props stand against its backdrop in each scene,
// and the server's plugin for it, with its steps and hints.
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

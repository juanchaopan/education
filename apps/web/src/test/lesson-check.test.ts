import { describe, expect, it } from 'vitest';
import { establishing, framed } from '../features/learning/components/lesson-stage/stage-look';
import type { TeacherRole } from '../features/learning/lessons/lesson-definition';
import type { LessonOutline } from '../features/learning/lessons/registry';
import { backdrops, type BackdropId } from '../features/learning/media/backdrops/backdrops';
import {
  lessonProblems,
  narrationProblems,
  type NarrationRecord,
  type PluginOutline,
  type VoiceConfig,
} from './lesson-check';
import { fixtureLesson } from './lesson-fixture';

const listed = { id: 'fixture', version: 1 };
const plugin: PluginOutline = { steps: ['look', 'count', 'after'], hints: ['look-again'] };
const outline: LessonOutline = fixtureLesson;
const { script } = outline;

function problems(change: Partial<LessonOutline>, against = plugin) {
  return lessonProblems(listed, { ...outline, ...change }, against);
}

const outside = (shot: string) =>
  `the props stand outside the clearing of ${fixtureLesson.backdrop} in scene ${shot}`;

describe('the lesson definition check', () => {
  it('passes a lesson that agrees with its registry line and its plugin', () => {
    expect(problems({})).toEqual([]);
  });

  it('finds a line without a recording', () => {
    const lines = { ...script.lines, ask: { text: '一共有几颗？', clip: '' } };
    expect(problems({ script: { ...script, lines } })).toEqual(['line ask has no recording']);
  });

  it('finds a scene without entry lines, or with a line the script lacks', () => {
    const entryLines = { ...script.entryLines, count: [], after: ['gone'] };
    expect(problems({ script: { ...script, entryLines } })).toEqual([
      'scene count has no entry lines',
      'entry line gone is not in the script',
    ]);
  });

  it('finds an answer scene that is not a scene', () => {
    const answer = { ...outline.answer, shot: 'counting' };
    expect(problems({ answer })).toEqual(['answer scene counting is not a scene']);
  });

  it('finds an answer scene with no scene after it to play on into', () => {
    const answer = { ...outline.answer, shot: 'after' };
    expect(problems({ answer })).toEqual(['answer scene after has no scene after it']);
  });

  it('finds props that stand outside the backdrop clearing, even by a little', () => {
    const clearing = framed(backdrops[fixtureLesson.backdrop].clearZone, establishing);
    expect(problems({ staging: clearing })).toEqual([]);
    expect(problems({ staging: { ...clearing, width: clearing.width + 1 } })).toEqual([
      outside('look'),
      outside('count'),
      outside('after'),
    ]);
  });

  it('finds props that a scene framing the backdrop elsewhere leaves outside its clearing', () => {
    const cameras = { count: { zoom: 1, x: 50 } };
    expect(problems({ script: { ...script, cameras } })).toEqual([outside('count')]);
  });

  // A lesson naming a backdrop or teacher outside the library fails the type
  // check. Each expected error below is itself checked: were the name ever in
  // the library, the type check would fail on the unused expectation.
  it('lets a lesson pick only backdrops and teachers in the library', () => {
    // @ts-expect-error moon-base is not in the backdrop library
    const backdrop: BackdropId = 'moon-base';
    // @ts-expect-error unicorn is not in the teacher library
    const teacher: TeacherRole['id'] = 'unicorn';
    expect([backdrop in backdrops, teacher]).toEqual([false, 'unicorn']);
  });

  it('finds scenes and plugin steps that do not match', () => {
    const steps = ['look', 'count', 'later'];
    expect(problems({}, { ...plugin, steps })).toEqual([
      'scene after is not a plugin step',
      'plugin step later is not a scene',
    ]);
  });

  it('finds an answer hint the plugin does not have', () => {
    const answer = { ...outline.answer, hints: ['look-again', 'count-twice'] };
    expect(problems({ answer })).toEqual(['hint count-twice is not in the plugin']);
  });

  it('finds a version the definition does not share with its registry line', () => {
    expect(problems({ problem: { id: 'fixture', version: 2 } })).toEqual([
      'registered as fixture/1 but defined as fixture/2',
    ]);
  });

  it('finds a version the server keeps no plugin for', () => {
    expect(lessonProblems(listed, outline, undefined)).toEqual([
      'the server has no plugin for fixture/1',
    ]);
  });
});

describe('the narration check', () => {
  const config: VoiceConfig = {
    engine: 'edge-tts',
    'edge-tts': { name: 'zh-CN-XiaoxiaoNeural', rate: '-14%', package: 'edge-tts==7.3.1' },
  };
  const voice = { engine: 'edge-tts', name: 'zh-CN-XiaoxiaoNeural', rate: '-14%' };
  // What the fixture's recordings were made from, by file name.
  const hello = { 'hello.mp3': '看看这颗小石子。' };
  const ask = { 'ask.mp3': '一共有几颗？' };
  const record: NarrationRecord = {
    voice,
    recordings: { ...hello, ...ask, 'bye.mp3': '数完了。' },
  };

  it('passes a lesson whose every line was recorded from its words in the configured voice', () => {
    expect(narrationProblems(outline, config, record)).toEqual([]);
  });

  it('finds a line whose words changed after it was recorded', () => {
    const lines = { ...script.lines, ask: { text: '一共有几个？', clip: '/fixture/ask.mp3' } };
    const edited = { ...outline, script: { ...script, lines } };
    expect(narrationProblems(edited, config, record)).toEqual([
      'line ask was not recorded from its words',
    ]);
  });

  it('finds a line recorded without the tool, and a lesson with no record at all', () => {
    const unrecorded = { voice, recordings: { ...hello, ...ask } };
    expect(narrationProblems(outline, config, unrecorded)).toEqual([
      'line bye was not recorded from its words',
    ]);
    expect(narrationProblems(outline, config, undefined)).toEqual([
      'the lesson has no narration record',
    ]);
  });

  it('finds a lesson recorded in another voice than the configuration names', () => {
    const slower = { ...record, voice: { ...voice, rate: '-20%' } };
    expect(narrationProblems(outline, config, slower)).toEqual([
      'the lesson was recorded with another rate than lesson-voice.json',
    ]);
  });
});

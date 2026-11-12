import { describe, expect, it } from 'vitest';
import {
  boardReach,
  establishing,
  framed,
} from '../features/learning/components/lesson-stage/stage-look';
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
const { script, content } = outline;

function problems(change: Partial<LessonOutline>, against = plugin) {
  return lessonProblems(listed, { ...outline, ...change }, against);
}

const outside = (shot: string) =>
  `the props stand outside the clearing of ${fixtureLesson.backdrop} in scene ${shot}`;

describe('the lesson definition check', () => {
  it('passes a lesson that agrees with its registry line, its content and its plugin', () => {
    expect(problems({})).toEqual([]);
  });

  it('finds a line without a recording', () => {
    const lines = { ...script.lines, ask: { text: '一共有几颗？', clip: '' } };
    expect(problems({ script: { ...script, lines } })).toEqual(['line ask has no recording']);
  });

  it("finds a script that plays other lines, words or entry lines than the lesson's content", () => {
    const { bye, ...kept } = script.lines;
    const lines = { ...kept, ask: { ...script.lines.ask, text: '有几颗？' }, extra: bye };
    const entryLines = { ...script.entryLines, count: [] };
    expect(problems({ script: { ...script, lines, entryLines } })).toEqual([
      'script line extra is not in the content',
      'content line bye is not in the script',
      'script line ask says other words than the content',
      "the script's entry lines of count are not the content's",
    ]);
  });

  it("finds a script whose scenes are not the content's", () => {
    const shots = ['look', 'after', 'count'] as const;
    expect(problems({ script: { ...script, shots } })).toContain(
      "the script's scenes are not the content's scenes",
    );
  });

  it("finds what is wrong with the lesson's content itself", () => {
    const scenes = { ...content.scenes, after: { prompt: '孩子数完了。', entry: [] } };
    expect(problems({ content: { ...content, scenes } })).toEqual([
      'scene after has no entry lines',
      "the script's entry lines of after are not the content's",
    ]);
  });

  it('finds a lesson flow that is not in the list', () => {
    const flow = 'step-by-step' as LessonOutline['content']['flow'];
    expect(problems({ content: { ...content, flow } })).toEqual([
      'the lesson follows flow step-by-step, which is not in the list',
    ]);
  });

  it("finds what the lesson's flow asks of its answer scene", () => {
    expect(problems({ content: { ...content, answerScene: 'after' } })).toEqual([
      'answer scene after has no scene after it',
    ]);
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
    const answer = { hints: ['look-again', 'count-twice'] };
    expect(problems({ answer })).toEqual(['hint count-twice is not in the plugin']);
  });

  it('finds a version the content does not share with its registry line', () => {
    const problem = { id: 'fixture', version: 2 };
    expect(problems({ content: { ...content, problem } })).toEqual([
      'registered as fixture/1 but defined as fixture/2',
    ]);
  });

  it('finds a version the server keeps no plugin for', () => {
    expect(lessonProblems(listed, outline, undefined)).toEqual([
      'the server has no plugin for fixture/1',
    ]);
  });
});

describe('the conclusion check', () => {
  type Conclusions = LessonOutline['content']['conclusions'];
  const counted = {
    id: 'one-pebble',
    says: '桌上有 1 颗小石子',
    amounts: [[1, 'pebble']],
    from: 'count',
    uses: ['count', 'after'],
    hints: ['look-again'],
    answer: { amount: [1, 'bowl'], says: '桌上有 1 颗小石子，在 1 个碗里' },
  } satisfies Conclusions[number];
  const pictures = { pebble: 'pebble', bowl: 'bowl' };
  const declaring = (board: LessonOutline['board'], ...conclusions: Conclusions) =>
    problems({ content: { ...content, conclusions }, board });
  const keeping = (...conclusions: Conclusions) => declaring({ pictures }, ...conclusions);

  it('passes conclusions that agree with the hints, with or without a board', () => {
    expect(keeping(counted)).toEqual([]);
    expect(declaring(undefined, counted)).toEqual([]);
  });

  it('finds a conclusion lit by a hint the answer does not give, even with no board', () => {
    expect(declaring(undefined, { ...counted, hints: ['count-twice'] })).toEqual([
      'conclusion one-pebble is lit by hint count-twice, which the answer does not give',
    ]);
  });

  it('finds hints or a count meant for a conclusion that only shows after the count is asked', () => {
    expect(keeping({ ...counted, from: 'after', uses: [] })).toEqual([
      'conclusion one-pebble first shows after the count is asked, so the answer never reaches it',
    ]);
  });

  it('finds an amount, or the answer written on, drawn with a picture the board lacks', () => {
    expect(declaring({ pictures: { pebble: 'pebble' } }, counted)).toEqual([
      'conclusion one-pebble draws bowl, which has no picture',
    ]);
  });

  it('finds a board that says when something not declared is found', () => {
    const found = { 'one-pebble': () => true, 'two-pebbles': () => true };
    expect(declaring({ pictures, found }, counted)).toEqual([
      'the board says when two-pebbles is found, which is not a conclusion',
    ]);
  });

  it('finds props that reach up under the board along the top of a wide picture', () => {
    const staging = { ...outline.staging, y: boardReach - 1 };
    expect(problems({ staging, board: { pictures } })).toContain(
      'the props reach up under the conclusion board',
    );
    expect(problems({ staging })).not.toContain('the props reach up under the conclusion board');
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

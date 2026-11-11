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

describe('the conclusion board check', () => {
  type Conclusions = NonNullable<LessonOutline['board']>['conclusions'];
  const counted = {
    id: 'one-pebble',
    says: '桌上有 1 颗小石子',
    amounts: [[1, 'pebble']],
    from: 'count',
    uses: ['count', 'after'],
    hints: ['look-again'],
    answer: { amount: [1, 'bowl'], says: '桌上有 1 颗小石子，在 1 个碗里' },
  } satisfies Conclusions[number];
  const supposed = {
    id: 'two-pebbles',
    says: '假如桌上有 2 颗小石子',
    amounts: [[2, 'pebble']],
    from: 'after',
    supposed: true,
  } satisfies Conclusions[number];
  const pictures = { pebble: 'pebble', bowl: 'bowl' };
  const keeping = (...conclusions: Conclusions) => problems({ board: { pictures, conclusions } });

  it('passes a board whose conclusions agree with the scenes, hints and pictures', () => {
    expect(keeping(counted, supposed)).toEqual([]);
  });

  it('finds a conclusion that first shows in a scene the lesson does not have', () => {
    expect(keeping({ ...counted, from: 'counting' })).toEqual([
      'conclusion one-pebble first shows in counting, which is not a scene',
    ]);
  });

  it('finds a conclusion used before it shows, or in a scene the lesson does not have', () => {
    expect(keeping({ ...counted, uses: ['look', 'later'] })).toEqual([
      'conclusion one-pebble is used in look, which is not a scene from count on',
      'conclusion one-pebble is used in later, which is not a scene from count on',
    ]);
  });

  it('finds a conclusion lit by a hint the answer does not give', () => {
    expect(keeping({ ...counted, hints: ['count-twice'] })).toEqual([
      'conclusion one-pebble is lit by hint count-twice, which the answer does not give',
    ]);
  });

  it('finds hints or a count meant for a conclusion that only shows after the count is asked', () => {
    expect(keeping({ ...counted, from: 'after', uses: [] })).toEqual([
      'conclusion one-pebble first shows after the count is asked, so the answer never reaches it',
    ]);
  });

  it('finds a supposed conclusion with none on the board before it to stand beside', () => {
    const beside =
      'conclusion two-pebbles supposes a change but has no conclusion on the board to stand beside';
    expect(keeping(supposed)).toEqual([beside]);
    expect(
      keeping(
        { ...counted, from: 'after', hints: [], answer: undefined },
        {
          ...supposed,
          from: 'count',
        },
      ),
    ).toEqual([
      'conclusion one-pebble is used in count, which is not a scene from after on',
      beside,
    ]);
  });

  it('finds an amount, or the answer written on, drawn with a picture the board lacks', () => {
    expect(problems({ board: { pictures: { pebble: 'pebble' }, conclusions: [counted] } })).toEqual(
      ['conclusion one-pebble draws bowl, which has no picture'],
    );
  });

  it('finds two conclusions with the same id', () => {
    expect(keeping(counted, counted)).toEqual(['conclusion one-pebble is declared twice']);
  });

  it('finds props that reach up under the board along the top of a wide picture', () => {
    const staging = { ...outline.staging, y: boardReach - 1 };
    expect(problems({ staging, board: { pictures, conclusions: [counted] } })).toContain(
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

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  lessonLines,
  narrationPlan,
  parseRecord,
  recordSoFar,
  unusedRecordings,
  voiceChanged,
} from './lesson-narration.mjs';
import { readVoice, sameVoice, voiceOf } from './lesson-voice.mjs';

const assets = join(tmpdir(), 'lesson', 'assets');
const voice = { engine: 'edge-tts', name: 'zh-CN-XiaoxiaoNeural', rate: '-14%', pitch: '+5Hz' };
const line = (id, text) => ({ id, text, file: join(assets, `${id}.mp3`) });
const lines = [line('hello', '你好。'), line('ask', '一共有几颗？')];
const record = { voice, recordings: { 'hello.mp3': '你好。', 'ask.mp3': '一共有几颗？' } };
const everyFile = () => true;

const plan = (change = {}) =>
  narrationPlan({ lines, record, voice, assets, recorded: everyFile, ...change });
const recorded = (result) => result.toRecord.map(({ id }) => id);

test('records nothing when every line was recorded from its words in the voice', () => {
  const result = plan();
  assert.deepEqual(recorded(result), []);
  assert.deepEqual(result.next, record);
});

test('records again only the line whose words changed', () => {
  const edited = [lines[0], line('ask', '一共有几个？')];
  const result = plan({ lines: edited });
  assert.deepEqual(recorded(result), ['ask']);
  assert.equal(result.next.recordings['ask.mp3'], '一共有几个？');
  assert.equal(result.next.recordings['hello.mp3'], '你好。');
});

test('records a new line, and a line whose recording is missing', () => {
  const result = plan({
    lines: [...lines, line('bye', '数完了。')],
    recorded: (file) => !file.endsWith('hello.mp3'),
  });
  assert.deepEqual(recorded(result), ['hello', 'bye']);
});

test('records every line of a lesson with no record yet, or one made in another voice', () => {
  assert.deepEqual(recorded(plan({ record: undefined })), ['hello', 'ask']);
  const slower = { ...voice, rate: '-20%' };
  assert.deepEqual(recorded(plan({ voice: slower })), ['hello', 'ask']);
  assert.deepEqual(plan({ voice: slower }).next.voice, slower);
});

test('tells a lesson recorded in another voice from one new or in the same voice', () => {
  const other = { ...voice, name: 'zh-CN-XiaoyiNeural' };
  assert.ok(voiceChanged({ ...record, voice: other }, voice));
  assert.ok(!voiceChanged(record, voice));
  assert.ok(!voiceChanged(undefined, voice));
  assert.ok(!voiceChanged({ voice: other, recordings: {} }, voice));
});

test('drops a removed line from the record and finds the recordings no line plays', () => {
  const result = plan({ lines: [lines[0]] });
  assert.deepEqual(result.next.recordings, { 'hello.mp3': '你好。' });
  const files = ['hello.mp3', 'ask.mp3', 'narration.json'];
  assert.deepEqual(unusedRecordings(files, result.next.recordings), ['ask.mp3']);
});

test("refuses a recording outside the lesson's assets folder or shared by two lines", () => {
  const outside = { id: 'far', text: '远。', file: join(tmpdir(), 'far.mp3') };
  assert.throws(() => plan({ lines: [outside] }), /outside the lesson's assets folder/);
  const twice = [lines[0], { ...lines[0], id: 'again' }];
  assert.throws(() => plan({ lines: twice }), /shares hello.mp3/);
});

test('leaves the recordings still to be made out of the record', () => {
  assert.deepEqual(recordSoFar(record, new Set(['ask.mp3'])), {
    voice,
    recordings: { 'hello.mp3': '你好。' },
  });
});

test('reads a narration record, and names the file of one without its voice or recordings', () => {
  assert.deepEqual(parseRecord(JSON.stringify(record), 'narration.json'), record);
  assert.throws(() => parseRecord('{"voice": {}}', 'lesson/narration.json'), /lesson\/narration/);
  assert.throws(() => parseRecord('null', 'narration.json'), /"voice" and a "recordings"/);
});

test("names a voice by its engine and the engine's settings a listener hears", () => {
  const { engine, name, rate, pitch } = voice;
  const configured = {
    engine,
    [engine]: { name, rate, pitch, package: 'edge-tts==7.3.1', python: '3.12' },
  };
  assert.deepEqual(voiceOf(configured), voice);
  assert.ok(sameVoice(voiceOf(configured), { pitch, ...voice }));
  assert.ok(!sameVoice(undefined, voice));
  assert.ok(!sameVoice({ ...voice, pitch: '+0Hz' }, voice));
  assert.throws(() => voiceOf({ ...configured, engine: 'unknown' }), /names no engine/);
});

test('leaves a setting the configuration does not give out of the voice, as the record does', () => {
  const configured = { engine: 'edge-tts', 'edge-tts': { name: 'zh-CN-XiaoxiaoNeural' } };
  const heard = voiceOf(configured);
  assert.deepEqual(heard, { engine: 'edge-tts', name: 'zh-CN-XiaoxiaoNeural' });
  assert.ok(sameVoice(heard, JSON.parse(JSON.stringify(heard))));
});

test('the configured voice names an engine the tool has', async () => {
  const configured = await readVoice();
  assert.equal(voiceOf(configured).engine, configured.engine);
});

test("reads a lesson's lines and where each recording belongs, recorded or not", async () => {
  const folder = realpathSync(mkdtempSync(join(tmpdir(), 'lesson-narration-')));
  try {
    mkdirSync(join(folder, 'assets'));
    writeFileSync(join(folder, 'assets', 'hello.mp3'), '');
    writeFileSync(join(folder, 'words.ts'), "export const ask: string = '一共有几颗？';\n");
    writeFileSync(
      join(folder, 'script.ts'),
      [
        "import type { Unused } from './types';",
        "import hello from './assets/hello.mp3';",
        "import ask from './assets/ask.mp3';",
        "import { ask as askText } from './words';",
        "export const lines = { hello: { text: '你好。', clip: hello }, ask: { text: askText, clip: ask } };",
        'export type Kept = Unused;',
      ].join('\n'),
    );
    assert.deepEqual(await lessonLines(folder), [
      { id: 'hello', text: '你好。', file: join(folder, 'assets', 'hello.mp3') },
      { id: 'ask', text: '一共有几颗？', file: join(folder, 'assets', 'ask.mp3') },
    ]);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});

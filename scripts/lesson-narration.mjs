import { existsSync, realpathSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { register } from 'node:module';
import { basename, dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readVoice, sameVoice, say, voiceOf } from './lesson-voice.mjs';

// Records a lesson's narration: `npm run lesson:narrate -- <lesson folder>`.
// It reads the lines from the lesson's script, `lessons/<lesson>/script.ts`,
// and records, in the voice of lesson-voice.json, only the lines whose
// recording is missing or was made from other words. What each recording
// says, and in which voice, is kept beside the recordings in
// `assets/narration.json`, which the definition check compares with the
// lines, so an edited line that was not recorded again fails the tests.
//
// A lesson recorded in another voice than the one configured is recorded
// again only when asked with `--new-voice`, since that replaces every line a
// maintainer has listened to.

const root = fileURLToPath(new URL('../', import.meta.url));
const lessonsFolder = join(root, 'apps/web/src/features/learning/lessons');
const lessonName = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const newVoiceFlag = '--new-voice';

let hooked = false;

// Each line's words and the file its recording belongs in, in script order.
export async function lessonLines(folder) {
  if (!hooked) register(new URL('./lesson-script-hooks.mjs', import.meta.url));
  hooked = true;
  const { lines } = await import(pathToFileURL(join(folder, 'script.ts')).href);
  return Object.entries(lines).map(([id, { text, clip }]) => ({ id, text, file: clip }));
}

// Which lines to record and what the record says once they are. A
// recording is kept when its file is there and the record says it was made
// from the line's words in the voice now chosen. Recordings belong in the
// lesson's own assets folder, one line to a file.
export function narrationPlan({ lines, record, voice, assets, recorded }) {
  const recordings = {};
  const toRecord = [];
  const voiceKept = sameVoice(record?.voice, voice);
  for (const { id, text, file } of lines) {
    if (dirname(file) !== assets)
      throw new Error(`line ${id} is recorded outside the lesson's assets folder: ${file}`);
    const name = basename(file);
    if (name in recordings) throw new Error(`line ${id} shares ${name} with another line`);
    recordings[name] = text;
    if (!voiceKept || record.recordings[name] !== text || !recorded(file))
      toRecord.push({ id, text, file });
  }
  return { toRecord, next: { voice, recordings } };
}

// Whether the lesson has recordings in a voice other than the one chosen.
export const voiceChanged = (record, voice) =>
  !!record && Object.keys(record.recordings).length > 0 && !sameVoice(record.voice, voice);

// The record while some recordings are still to be made: they are left out,
// so a run that stops part way records them on the next run.
export function recordSoFar(next, pending) {
  const recordings = Object.entries(next.recordings).filter(([name]) => !pending.has(name));
  return { voice: next.voice, recordings: Object.fromEntries(recordings) };
}

// Recordings in the assets folder that no line plays any more.
export function unusedRecordings(files, recordings) {
  return files.filter((file) => file.endsWith('.mp3') && !(file in recordings));
}

// A lesson's narration record as written to its file. A record without its
// voice or recordings is refused by name.
export function parseRecord(json, file) {
  const record = JSON.parse(json);
  const { voice, recordings } = record ?? {};
  if (typeof voice !== 'object' || typeof recordings !== 'object' || !voice || !recordings)
    throw new Error(`${file} needs a "voice" and a "recordings" object`);
  return record;
}

async function readRecord(file) {
  return existsSync(file) ? parseRecord(await readFile(file, 'utf8'), file) : undefined;
}

const writeRecord = (file, record) => writeFile(file, `${JSON.stringify(record, null, 2)}\n`);

// The lesson's folder by its real path, the one the script's imports resolve
// to, so its recordings are found inside it however the checkout is reached.
function lessonFolder(name) {
  const folder = join(lessonsFolder, name ?? '');
  if (!name || !lessonName.test(name) || !existsSync(join(folder, 'script.ts')))
    throw new Error('Name a lesson folder with a script.ts: npm run lesson:narrate -- <lesson>');
  return realpathSync(folder);
}

// Makes the recordings the plan asks for, one line at a time, writing the
// record before the first and after each, so it always says what the files
// hold. A new lesson's assets folder is made first.
async function recordLines({ toRecord, next }, voice, recordFile) {
  await mkdir(dirname(recordFile), { recursive: true });
  const pending = new Set(toRecord.map(({ file }) => basename(file)));
  await writeRecord(recordFile, recordSoFar(next, pending));
  for (const { id, text, file } of toRecord) {
    await say(voice, text, file);
    pending.delete(basename(file));
    await writeRecord(recordFile, recordSoFar(next, pending));
    console.log(`recorded ${id}: ${relative(root, file)}`);
  }
}

const described = (voice) => JSON.stringify(voice);

async function narrate(name, { newVoice }) {
  const folder = lessonFolder(name);
  const assets = join(folder, 'assets');
  const recordFile = join(assets, 'narration.json');
  const configured = await readVoice();
  const voice = voiceOf(configured);
  const record = await readRecord(recordFile);
  if (voiceChanged(record, voice) && !newVoice)
    throw new Error(
      `${name} was recorded in ${described(record.voice)}, and lesson-voice.json names ` +
        `${described(voice)}. Run again with ${newVoiceFlag} to record every line in the new voice.`,
    );
  const lines = await lessonLines(folder);
  const plan = narrationPlan({ lines, record, voice, assets, recorded: existsSync });
  await recordLines(plan, configured, recordFile);
  const files = await readdir(assets);
  for (const file of unusedRecordings(files, plan.next.recordings))
    console.log(`no line plays ${file}; delete it if nothing else does`);
  const total = Object.keys(plan.next.recordings).length;
  console.log(`${name}: recorded ${plan.toRecord.length} of ${total} lines`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = process.argv.slice(2);
  try {
    const name = args.find((arg) => !arg.startsWith('--'));
    await narrate(name, { newVoice: args.includes(newVoiceFlag) });
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

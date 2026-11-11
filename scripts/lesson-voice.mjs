import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { edgeTts } from './lesson-voices/edge-tts.mjs';

// The narration voice the lessons are recorded in, read from
// lesson-voice.json: `engine` names the speech synthesizer and the block
// under the engine's name holds its settings. Changing the voice is a change
// to that file; the lines are then recorded again.
//
// An engine says which of its settings a listener hears change (`heard`) and
// says the words of a UTF-8 text file into the recording file (`speak`).
const engines = { 'edge-tts': edgeTts };

export async function readVoice(file = new URL('./lesson-voice.json', import.meta.url)) {
  return JSON.parse(await readFile(file, 'utf8'));
}

function engineOf(voice) {
  const engine = engines[voice.engine];
  if (!engine) throw new Error(`lesson-voice.json names no engine this tool has: ${voice.engine}`);
  return { engine, settings: voice[voice.engine] ?? {} };
}

// What a recording's voice is, as a lesson's narration record keeps it: the
// engine and the settings a listener hears, leaving out any the
// configuration does not set, as the record written to JSON does. A
// recording made in any other voice is a different voice.
export function voiceOf(voice) {
  const { engine, settings } = engineOf(voice);
  const heard = Object.entries(engine.heard(settings)).filter(([, value]) => value !== undefined);
  return { engine: voice.engine, ...Object.fromEntries(heard) };
}

const sorted = (voice) =>
  JSON.stringify(Object.entries(voice).sort(([a], [b]) => (a < b ? -1 : 1)));

export const sameVoice = (one, other) => !!one && !!other && sorted(one) === sorted(other);

// Says the words in the voice and saves them as the recording at `target`.
// The words reach the engine in a UTF-8 file, the same on every system.
export async function say(voice, words, target) {
  const { engine, settings } = engineOf(voice);
  const work = await mkdtemp(join(tmpdir(), 'lesson-voice-'));
  const text = join(work, 'line.txt');
  try {
    await writeFile(text, `${words}\n`, 'utf8');
    engine.speak(settings, text, target);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

// How loud the microphone is right now, from 0 for silence to about 1.
export type Meter = { level(): number; close(): void };

// What a stretch of listening has come to: still listening, a child who spoke
// and then fell quiet, or nobody speaking at all.
type Heard = 'listening' | 'spoken' | 'nothing';

// A level above this is someone speaking; below it is the room. Speech close
// to a tablet or laptop microphone is well above it, a quiet room well below.
const speechLevel = 0.02;
// How long a child stays quiet after speaking before the answer counts as said.
export const endOfSpeechMs = 1500;
// How long the microphone waits for a first word before it closes.
export const firstWordMs = 8000;

// Judges a run of levels, each with the time it was read, from the moment the
// microphone opened. The answer is said once speech is followed by a long
// enough quiet; nothing is said when no speech comes in time.
export function createListening(openedAt: number) {
  let lastSpeech: number | undefined;
  return (level: number, at: number): Heard => {
    if (level >= speechLevel) lastSpeech = at;
    if (lastSpeech === undefined) return at - openedAt >= firstWordMs ? 'nothing' : 'listening';
    return at - lastSpeech >= endOfSpeechMs ? 'spoken' : 'listening';
  };
}

// The loudness of a microphone stream, read through the lesson's audio
// context, which the child's tap has already started. Closing it leaves the
// context to the lesson. A context that is not running would read silence
// whatever the child says, so without a running one there is no meter, and
// the recording ends when the child stops it or at its time limit.
export function browserMeter(context: AudioContext | undefined, stream: MediaStream) {
  if (context?.state !== 'running') return undefined;
  try {
    const analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    const source = context.createMediaStreamSource(stream);
    source.connect(analyser);
    const samples = new Float32Array(analyser.fftSize);
    const meter: Meter = {
      level() {
        analyser.getFloatTimeDomainData(samples);
        const power = samples.reduce((sum, sample) => sum + sample * sample, 0);
        return Math.sqrt(power / samples.length);
      },
      close: () => source.disconnect(),
    };
    return meter;
  } catch {
    return undefined;
  }
}

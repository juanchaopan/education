import {
  feedbackTextMaxLength,
  transcriptionAudioMaxBytes,
  transcriptionMaxSeconds,
  type TranscriptionFormat,
} from '@education/contracts';
import type { BillingResult } from './tutoring-cost.js';

export const TRANSCRIPTION_MODEL = 'gpt-transcribe';
// US$0.0045 a minute, in nanodollars a millisecond.
const NANODOLLARS_PER_MILLISECOND = 75n;
// The provider may measure a little more than the recorder's limit, for example
// after the last encoded frame.
const MAX_BILLED_SECONDS = transcriptionMaxSeconds + 2;
export const transcriptionReservation =
  BigInt(MAX_BILLED_SECONDS * 1000) * NANODOLLARS_PER_MILLISECOND;

const MIN_AUDIO_BYTES = 64;
const EBML_MAGIC = Buffer.from([0x1a, 0x45, 0xdf, 0xa3]);

// The container's own signature, so a mislabelled or truncated upload is never
// sent: WebM starts with an EBML header, MP4 with an `ftyp` box.
function hasSignature(audio: Buffer, format: TranscriptionFormat) {
  if (format === 'webm') return audio.subarray(0, 4).equals(EBML_MAGIC);
  return audio.subarray(4, 8).toString('latin1') === 'ftyp';
}

export function transcriptionAudio(base64: string, format: TranscriptionFormat) {
  if (base64.length % 4 !== 0) return;
  const audio = Buffer.from(base64, 'base64');
  if (audio.length < MIN_AUDIO_BYTES || audio.length > transcriptionAudioMaxBytes) return;
  return hasSignature(audio, format) ? audio : undefined;
}

function measuredSeconds(usage: unknown) {
  if (!usage || typeof usage !== 'object') return;
  const { type, seconds } = usage as Record<string, unknown>;
  if (
    type === 'duration' &&
    typeof seconds === 'number' &&
    Number.isFinite(seconds) &&
    seconds >= 0
  )
    return seconds;
}

// The provider bills by the duration it measured; any other report keeps the
// reservation, so an unexpected reply never costs the budget less than it held.
export function transcriptionBilling(usage: unknown): BillingResult {
  const seconds = measuredSeconds(usage);
  if (seconds === undefined) return { status: 'unknown' };
  // Rounding to microseconds first keeps binary fractions such as 4.98 from
  // tipping into the next millisecond.
  const milliseconds = Math.ceil(Math.round(seconds * 1e6) / 1e3);
  const amount = BigInt(milliseconds) * NANODOLLARS_PER_MILLISECOND;
  return seconds <= MAX_BILLED_SECONDS
    ? { status: 'settled', amount }
    : { status: 'out-of-bounds', amount };
}

const INVISIBLE = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]+/gu;

// What was heard becomes editable text: line breaks and control characters
// turn into spaces. An empty result means nothing was heard; a result too
// long to be one step's answer is refused.
export function acceptTranscript(text: unknown) {
  if (typeof text !== 'string') return;
  const plain = text.replace(INVISIBLE, ' ').replace(/\s+/g, ' ').trim();
  return plain.length <= feedbackTextMaxLength ? plain : undefined;
}

const MAX_WORD_LENGTH = 20;
const MAX_WORDS = 30;

// The step's own words, joined into the short hint recognition accepts.
export function vocabularyPrompt(words: readonly string[] | undefined) {
  const usable = (words ?? [])
    .map((word) => word.trim())
    .filter((word) => word && word.length <= MAX_WORD_LENGTH)
    .slice(0, MAX_WORDS);
  return usable.length ? usable.join('、') : undefined;
}

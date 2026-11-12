import { Type, type Static } from '@sinclair/typebox';
import { AiHelpFallbackResult } from './ai-help.js';
import { base64Length, base64Pattern } from './patterns.js';
import { ChildText, StepId } from './teaching-feedback.js';

const closed = { additionalProperties: false };

// A recording is a short answer to one step, stopped by the child or at the limit.
export const transcriptionMaxSeconds = 30;
// The recorder asks for 32 kbit/s, about 120 KB at the limit. Browsers may not
// honour the request exactly, so the byte cap leaves room for twice that rate.
export const transcriptionAudioBitsPerSecond = 32_000;
export const transcriptionAudioMaxBytes = 256 * 1024;
const transcriptionAudioMaxLength = base64Length(transcriptionAudioMaxBytes);
export const transcriptionBodyLimit = transcriptionAudioMaxLength + 1024;

// The containers browsers produce with MediaRecorder: WebM/Opus where available, otherwise MP4/AAC.
export const transcriptionFormats = ['webm', 'mp4'] as const;
export type TranscriptionFormat = (typeof transcriptionFormats)[number];

export const TranscriptionRequest = Type.Object(
  {
    stepId: StepId,
    format: Type.Union(transcriptionFormats.map((format) => Type.Literal(format))),
    audio: Type.String({
      minLength: 4,
      maxLength: transcriptionAudioMaxLength,
      pattern: base64Pattern.source,
    }),
  },
  closed,
);

// What was heard is only a proposal: the child reads and corrects it before it
// becomes the step's text answer. `unheard` means no words were recognised.
export const TranscriptionResult = Type.Union([
  Type.Object({ status: Type.Literal('ready'), text: ChildText }, closed),
  Type.Object({ status: Type.Literal('unheard') }, closed),
  AiHelpFallbackResult,
]);

export type TranscriptionRequest = Static<typeof TranscriptionRequest>;
export type TranscriptionResult = Static<typeof TranscriptionResult>;

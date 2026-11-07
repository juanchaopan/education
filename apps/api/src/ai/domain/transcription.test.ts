import { describe, expect, it } from 'vitest';
import { transcriptionAudioMaxBytes } from '@education/contracts';
import { webmRecording as webm } from '../services/gateway-fixtures.js';
import { largestReservationCost } from './ai-budget.js';
import {
  acceptTranscript,
  transcriptionAudio,
  transcriptionCharge,
  transcriptionReservation,
  vocabularyPrompt,
} from './transcription.js';

const mp4 = Buffer.concat([
  Buffer.from([0, 0, 0, 0x18]),
  Buffer.from('ftypM4A '),
  Buffer.alloc(96),
]);

describe('recorded audio', () => {
  it('accepts WebM and MP4 recordings by their container signature', () => {
    expect(transcriptionAudio(webm.toString('base64'), 'webm')).toEqual(webm);
    expect(transcriptionAudio(mp4.toString('base64'), 'mp4')).toEqual(mp4);
  });

  it.each([
    ['a WebM label on MP4 data', mp4.toString('base64'), 'webm'],
    ['an MP4 label on WebM data', webm.toString('base64'), 'mp4'],
    ['a tiny fragment', webm.subarray(0, 32).toString('base64'), 'webm'],
    ['unpadded base64', webm.toString('base64').replace(/=+$/, '') + 'A', 'webm'],
    [
      'audio over the size cap',
      Buffer.concat([webm, Buffer.alloc(transcriptionAudioMaxBytes)]).toString('base64'),
      'webm',
    ],
  ] as const)('refuses %s', (_name, audio, format) => {
    expect(transcriptionAudio(audio, format)).toBeUndefined();
  });
});

describe('billing', () => {
  it('holds 32 seconds at the per-minute rate and covers it in the parent status', () => {
    expect(transcriptionReservation).toBe(2_400_000n);
    expect(largestReservationCost).toBe(2_400_000n);
  });

  it('settles the measured duration and keeps the hold when none is reported', () => {
    expect(transcriptionCharge({ type: 'duration', seconds: 4.98 })).toEqual({
      billing: { status: 'settled', amount: 373_500n },
      withinLimit: true,
    });
    for (const usage of [
      undefined,
      { type: 'tokens', input_tokens: 80, output_tokens: 10 },
      { type: 'duration', seconds: -1 },
      { type: 'duration', seconds: Number.POSITIVE_INFINITY },
      { type: 'duration', seconds: '5' },
    ])
      expect(transcriptionCharge(usage)).toEqual({
        billing: { status: 'unknown' },
        withinLimit: true,
      });
  });

  it('charges audio over the limit what was measured without marking the month out of bounds', () => {
    expect(transcriptionCharge({ type: 'duration', seconds: 32 }).withinLimit).toBe(true);
    expect(transcriptionCharge({ type: 'duration', seconds: 130 })).toEqual({
      billing: { status: 'settled', amount: 9_750_000n },
      withinLimit: false,
    });
  });
});

describe('recognised text', () => {
  it('turns line breaks and control characters into single spaces', () => {
    expect(acceptTranscript('  我把十二\n平均分\u0000成三份 每份是四。 ')).toBe(
      '我把十二 平均分 成三份 每份是四。',
    );
  });

  it('reports silence as empty text and refuses replies that are not one answer', () => {
    expect(acceptTranscript(' \n ')).toBe('');
    expect(acceptTranscript('答'.repeat(501))).toBeUndefined();
    expect(acceptTranscript(undefined)).toBeUndefined();
    expect(acceptTranscript({ text: '四' })).toBeUndefined();
  });
});

describe('step vocabulary', () => {
  it('joins the usable words and drops empty or overlong ones', () => {
    expect(vocabularyPrompt([' 平均分 ', '', '每份', '很'.repeat(21)])).toBe('平均分、每份');
    expect(vocabularyPrompt(Array.from({ length: 40 }, (_, index) => `词${index}`))).toBe(
      Array.from({ length: 30 }, (_, index) => `词${index}`).join('、'),
    );
  });

  it('sends no hint when the step lists no words', () => {
    expect(vocabularyPrompt(undefined)).toBeUndefined();
    expect(vocabularyPrompt([' '])).toBeUndefined();
  });
});

import { expect, it } from 'vitest';
import type { VoiceState } from './voice-input';
import { voiceReadiness } from './voice-readiness';

it('holds a reload while the child speaks or the words are on their way back', () => {
  for (const status of ['starting', 'recording', 'transcribing'] as const)
    expect(voiceReadiness({ status })).toBe('saving');
});

it('keeps words the child has not confirmed yet', () => {
  expect(voiceReadiness({ status: 'review', text: '三个' })).toBe('unsaved');
});

it('lets the page reload once nothing is said or waiting', () => {
  const settled: VoiceState[] = [
    { status: 'idle' },
    { status: 'guidance' },
    { status: 'unheard' },
    { status: 'unavailable', reason: 'denied' },
    { status: 'fallback', reason: 'unavailable' },
  ];
  for (const state of settled) expect(voiceReadiness(state)).toBe('ready');
});

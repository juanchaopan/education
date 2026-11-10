import { expect, it } from 'vitest';
import { fakeAudio } from '../../../test/fake-audio';
import { createChime } from './chime';
import { createNarration } from './narration';

it('plays the lines muted while the sound is off, and still hears each to its end', async () => {
  const { audios, createAudio } = fakeAudio();
  const narration = createNarration({ createAudio });
  narration.mute(true);
  const heard = narration.interrupt('count', '/intro.mp3');
  const [audio] = audios;
  expect(audio!.muted).toBe(true);
  audio!.dispatchEvent(new Event('playing'));
  audio!.dispatchEvent(new Event('ended'));
  await expect(heard).resolves.toBe('ended');
  narration.mute(false);
  expect(audio!.muted).toBe(false);
});

it('keeps the tones quiet while the sound is off, but still starts the audio context', () => {
  const started: string[] = [];
  class Context {
    currentTime = 0;
    destination = {};
    resume = async () => void started.push('resume');
    createOscillator = () => {
      started.push('tone');
      return {};
    };
  }
  globalThis.AudioContext = Context as unknown as typeof AudioContext;
  const chime = createChime();
  chime.mute(true);
  chime.play([392, 494]);
  expect(started).toEqual(['resume']);
  Reflect.deleteProperty(globalThis, 'AudioContext');
});

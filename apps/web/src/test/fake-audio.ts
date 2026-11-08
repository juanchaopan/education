import { vi } from 'vitest';

// Audio elements that play and pause without a sound device. Every element the
// code under test creates is kept, so a test can fire its media events.
export function fakeAudio() {
  const audios: HTMLAudioElement[] = [];
  const createAudio = () => {
    const audio = new Audio();
    vi.spyOn(audio, 'play').mockResolvedValue(undefined);
    vi.spyOn(audio, 'pause').mockImplementation(() => {});
    audios.push(audio);
    return audio;
  };
  return { audios, createAudio };
}

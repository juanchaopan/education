import { vi } from 'vitest';

// Audio elements that play, pause and load without a sound device. Every
// element the code under test creates is kept, so a test can fire its media
// events; `prepare` can make an element misbehave before it is first played.
export function fakeAudio(prepare: (audio: HTMLAudioElement) => void = () => {}) {
  const audios: HTMLAudioElement[] = [];
  const createAudio = () => {
    const audio = new Audio();
    vi.spyOn(audio, 'play').mockResolvedValue(undefined);
    vi.spyOn(audio, 'pause').mockImplementation(() => {});
    vi.spyOn(audio, 'load').mockImplementation(() => {});
    prepare(audio);
    audios.push(audio);
    return audio;
  };
  return { audios, createAudio };
}

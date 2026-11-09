import { expect, type Page } from '@playwright/test';
import { builtAddress, sourceName } from './built-file.js';

// What a lesson's player did with one of its recordings, by the address it
// played from.
type Heard = { clip: string; event: 'playing' | 'ended' | 'error' };
type Reporting = Window & { reportNarration: (clip: string, event: Heard['event']) => void };

// The address of the built recording with this file name.
export function recording(name: string) {
  return builtAddress(name, 'mp3');
}

// The player's events as `<recording> <event>`. A recording that pauses to
// buffer reports playing again as it goes on; that is still one playing.
function told(heard: readonly Heard[]) {
  const said = heard.map(({ clip, event }) => `${sourceName(clip)} ${event}`);
  return said.filter((entry, index) => entry !== said[index - 1]);
}

// Listens, from before the page loads, to every media element the page plays,
// and lets a test check line by line that each recording played to its end in
// the order of the script, with none skipped and none failed. A recording's
// end is filed under the recording that started playing, even when the player
// has already been given the next one. What is heard is kept by the test, so
// it outlives a reload of the page.
export async function listenToNarration(page: Page) {
  const heard: Heard[] = [];
  await page.exposeFunction('reportNarration', (clip: string, event: Heard['event']) => {
    heard.push({ clip, event });
  });
  await page.addInitScript(() => {
    const report = (clip: string, event: Heard['event']) =>
      (window as unknown as Reporting).reportNarration(clip, event);
    const watched = new WeakSet<HTMLMediaElement>();
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      if (!watched.has(this)) {
        watched.add(this);
        let sounding = this.src;
        this.addEventListener('playing', () => {
          sounding = this.src;
          report(sounding, 'playing');
        });
        this.addEventListener('ended', () => report(sounding, 'ended'));
        this.addEventListener('error', () => report(this.src, 'error'));
      }
      return play.call(this);
    };
  });
  let checked = 0;
  return {
    // Everything heard so far, across page loads, as `<recording> <event>`.
    told: () => told(heard),
    // Waits until the recordings named, and nothing else, have each started
    // and played to their end since the last check.
    async heard(recordings: readonly string[], timeout = 60_000) {
      const expected = recordings.flatMap((name) => [`${name} playing`, `${name} ended`]);
      let seen = 0;
      const latest = () => {
        const since = heard.slice(checked);
        seen = since.length;
        return told(since);
      };
      await expect.poll(latest, { timeout, intervals: [100, 250] }).toEqual(expected);
      checked += seen;
    },
  };
}

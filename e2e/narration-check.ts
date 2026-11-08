import { expect, type Page } from '@playwright/test';

// What a lesson's player did with one of its recordings, by the address it
// played from.
type Heard = { clip: string; event: 'playing' | 'ended' | 'error' };
type Watched = Window & { narration?: Heard[] };

// A build names a recording after its file with a hash added.
const built = String.raw`(-[\w-]{8})?\.mp3$`;

// The address of the built recording with this file name.
export function recording(name: string) {
  return new RegExp(`/${name}${built}`);
}

// A recording by its file name, without the hash a build adds to it.
function fileName(clip: string) {
  const name = new URL(clip).pathname.split('/').pop() ?? clip;
  return name.replace(new RegExp(built), '');
}

// The player's events as `<recording> <event>`. A recording that pauses to
// buffer reports playing again as it goes on; that is still one playing.
function told(heard: readonly Heard[]) {
  const said = heard.map(({ clip, event }) => `${fileName(clip)} ${event}`);
  return said.filter((entry, index) => entry !== said[index - 1]);
}

// Listens, from before the page loads, to every media element the page plays,
// and lets a test check line by line that each recording played to its end in
// the order of the script, with none skipped and none failed. A recording's
// end is filed under the recording that started playing, even when the player
// has already been given the next one.
export async function listenToNarration(page: Page) {
  await page.addInitScript(() => {
    const heard: { clip: string; event: string }[] = [];
    (window as Watched).narration = heard as Heard[];
    const watched = new WeakSet<HTMLMediaElement>();
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      if (!watched.has(this)) {
        watched.add(this);
        let sounding = this.src;
        this.addEventListener('playing', () => {
          sounding = this.src;
          heard.push({ clip: sounding, event: 'playing' });
        });
        this.addEventListener('ended', () => heard.push({ clip: sounding, event: 'ended' }));
        this.addEventListener('error', () => heard.push({ clip: this.src, event: 'error' }));
      }
      return play.call(this);
    };
  });
  let checked = 0;
  return {
    // Waits until the recordings named, and nothing else, have each started
    // and played to their end since the last check.
    async heard(recordings: readonly string[], timeout = 60_000) {
      const expected = recordings.flatMap((name) => [`${name} playing`, `${name} ended`]);
      let seen = 0;
      const latest = async () => {
        const since = await page.evaluate(
          (from) => ((window as Watched).narration ?? []).slice(from),
          checked,
        );
        seen = since.length;
        return told(since);
      };
      await expect.poll(latest, { timeout, intervals: [100, 250] }).toEqual(expected);
      checked += seen;
    },
  };
}

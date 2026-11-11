import { expect, type Locator, type Page } from '@playwright/test';

// Playing the garden film by hand, as a child does with a pointer.

async function drag(page: Page, source: Locator, target: Locator) {
  const from = (await source.boundingBox())!;
  const to = (await target.boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2 + 20, from.y + from.height / 2 + 10, { steps: 4 });
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
  await page.mouse.up();
}

// The film and the things a child touches in it, and what the rabbit says,
// in its subtitle in the picture.
export function gardenFilm(page: Page) {
  const film = page.getByRole('region', { name: '菜园天平互动短片' });
  return {
    film,
    basket: film.getByRole('button', { name: '旁边的篮子' }),
    apples: film.getByRole('button', { name: '苹果' }),
    cabbage: film.getByRole('button', { name: '青菜' }).first(),
    replace: film.getByRole('button', { name: '把这个苹果换成黄瓜' }),
    caption: film.getByRole('region', { name: '小兔的话' }).getByRole('status'),
  };
}

// One thing the child does in the film: the move, what shows once the film
// has taken it, and the recordings the rabbit then says, by file name.
export type FilmMove = { move: () => Promise<void>; shown?: () => Promise<void>; says: string[] };

// Swapping one of the apples on the scale for its cucumbers.
function swap(page: Page, says: string[]): FilmMove {
  const { replace } = gardenFilm(page);
  return { move: () => replace.click({ timeout: 20_000 }), says };
}

// Taking the cabbage away, weighing the apples down to three, showing what one
// apple weighs and swapping the three apples: every move from the first scene
// to the question of the count. The whole film fits on screen, so it is
// brought into view once and every prop and the basket can be reached.
export function movesToTheAnswer(page: Page): FilmMove[] {
  const { film, basket, apples, cabbage, caption } = gardenFilm(page);
  const dropApple = (shown: () => Promise<void>, says: string[]): FilmMove => ({
    move: () => drag(page, apples.last(), basket),
    shown,
    says,
  });
  return [
    {
      move: async () => {
        await film.scrollIntoViewIfNeeded();
        await drag(page, cabbage, basket);
      },
      shown: () => expect(apples).toHaveCount(6),
      says: ['tip', 'halve'],
    },
    dropApple(() => expect(apples).toHaveCount(5), []),
    dropApple(() => expect(apples).toHaveCount(4), []),
    dropApple(
      () => expect(caption).toHaveText(/碰一碰这个苹果/, { timeout: 20_000 }),
      ['balanced', 'one'],
    ),
    { move: () => apples.click(), says: ['three', 'bridge'] },
    swap(page, ['bridge-one']),
    swap(page, ['bridge-two']),
    swap(page, ['bridge-done']),
  ];
}

// The rest of the film after a correct count: the same three apples swapped
// for two cucumbers each.
export function movesInTheVariation(page: Page): FilmMove[] {
  return [swap(page, []), swap(page, []), swap(page, ['change-done'])];
}

// Makes the moves one after another, each once the film has taken the last,
// and whatever a test checks after each.
export async function play(
  moves: readonly FilmMove[],
  after: (move: FilmMove) => Promise<void> = async () => {},
) {
  for (const step of moves) {
    await step.move();
    await step.shown?.();
    await after(step);
  }
}

// Waits until the recordings named, and nothing else, have each played to
// their end since the last wait (see narration-check.ts).
type Listener = { heard: (recordings: readonly string[]) => Promise<void> };

// Starts the film and plays it to the question of the count, hearing each
// line to its end before the next move.
export async function hearToTheAnswer(page: Page, narration: Listener) {
  await page.getByRole('button', { name: /开始短片/ }).click({ timeout: 30_000 });
  await narration.heard(['hello', 'clue', 'question']);
  await play(movesToTheAnswer(page), ({ says }) => narration.heard(says));
}

// A signed-in child at the question of the count taps 9, as one whose
// browser has no microphone does, and plays the variation to its last line.
export async function answerAndHearTheVariation(page: Page, narration: Listener) {
  const answer = page.getByRole('region', { name: '说出答案' });
  const numbers = answer.getByRole('group', { name: '点一个数字回答' });
  await numbers.getByRole('button', { name: '9', exact: true }).click({ timeout: 30_000 });
  await expect(gardenFilm(page).caption).toHaveText(/答对了/);
  await answer.getByRole('button', { name: '接着看' }).click();
  await narration.heard(['change']);
  await play(movesInTheVariation(page), ({ says }) => narration.heard(says));
}

import { expect, test, type Page } from '@playwright/test';
import {
  acceptEveryGardenAnswer,
  signInAtTheGardenAnswer,
  signInAtTheGardenStart,
} from './child-at-the-answer.js';
import { gardenFilm, movesToTheAnswer, play } from './garden-film.js';

// The garden keeps what each scene finds on the conclusion board along the
// top of its picture: from the second scene on, the conclusions found so far
// stay in sight, the ones in use glow, the count is written on once the
// child has said it, and the variation's changed condition stands beside the
// one it changes. A screen reader reads each as a sentence.

const lesson = '/problems/garden-balance/1';

const cabbageApples = '1 棵青菜和 3 个苹果一样重';
const appleCucumbers = '1 个苹果和 3 根黄瓜一样重';
const cabbageGroups = '1 棵青菜和 3 组黄瓜一样重';
const supposed = '假如 1 个苹果和 2 根黄瓜一样重';

// Every recording downloads before the film can start, which can take a while
// with the other tests running beside this one.
test.beforeEach(() => test.setTimeout(120_000));

function boardOf(page: Page) {
  const board = gardenFilm(page).film.getByRole('list', { name: '记住的结论' });
  return {
    items: board.getByRole('listitem'),
    // One conclusion on the board, by the sentence a screen reader reads.
    conclusion: (says: string) => board.getByText(says, { exact: true }).locator('..'),
  };
}

const reading = (...sentences: string[]) => new RegExp(sentences.join('.*'));

test('keeps each conclusion found in sight, lighting the one in use', async ({ page }) => {
  await signInAtTheGardenStart(page);
  await page.goto(lesson);
  await page.getByRole('button', { name: /开始短片/ }).click({ timeout: 60_000 });
  const { items, conclusion } = boardOf(page);
  await expect(items).toHaveCount(0);
  const moves = movesToTheAnswer(page);

  // The cabbage set aside and the apples taken off until the scale is level.
  await play(moves.slice(0, 4));
  await expect(conclusion(cabbageApples)).toBeVisible();

  // The apple's cucumbers show; the swaps that follow use them.
  await play(moves.slice(4, 5));
  await expect(conclusion(appleCucumbers)).toHaveAttribute('aria-current', 'true', {
    timeout: 20_000,
  });
  await expect(conclusion(cabbageApples)).not.toHaveAttribute('aria-current');

  await play(moves.slice(5));
  await expect(conclusion(cabbageGroups)).toHaveAttribute('aria-current', 'true', {
    timeout: 20_000,
  });
  await expect(items).toHaveText([
    reading(cabbageApples),
    reading(appleCucumbers),
    reading(cabbageGroups),
  ]);
});

test('writes the count on once said right, and sets the changed condition beside the first', async ({
  page,
}) => {
  await signInAtTheGardenAnswer(page);
  await acceptEveryGardenAnswer(page, { outcome: 'assisted', hint: '先看第一架秤。' });
  await page.goto(lesson);
  await page.getByRole('button', { name: /接着上次的地方/ }).click({ timeout: 60_000 });
  const { film } = gardenFilm(page);
  const { items, conclusion } = boardOf(page);
  await expect(items).toHaveCount(3);

  // The first hint looks back at the first scale, which lights up.
  await film.getByRole('button', { name: /给我一个提示/ }).click({ timeout: 30_000 });
  await expect(conclusion(cabbageApples)).toHaveAttribute('aria-current', 'true');

  const answer = page.getByRole('region', { name: '说出答案' });
  const numbers = answer.getByRole('group', { name: '点一个数字回答' });
  await numbers.getByRole('button', { name: '9', exact: true }).click({ timeout: 30_000 });
  await expect(conclusion(`${cabbageGroups}，一共 9 根黄瓜`)).toBeVisible();

  await answer.getByRole('button', { name: '接着看' }).click();
  await expect(conclusion(supposed)).toHaveAttribute('aria-current', 'true');
  await expect(items).toHaveText([
    reading(cabbageApples),
    reading(appleCucumbers, supposed),
    reading(`${cabbageGroups}，一共 9 根黄瓜`),
  ]);
});

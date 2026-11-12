import type { ProblemOpening } from '@education/contracts';
import { expect, type Locator, type Page } from '@playwright/test';
import { givenBook } from './assigned-child.js';
import { lessonApi } from './child-at-the-answer.js';
import { play, type FilmMove, type Listener } from './film-play.js';

// Playing the rail chase film by hand, as a child does with a pointer.

// The rail chase as it opens for the child, filed in its book, and its part
// of the API.
export const railChase: ProblemOpening = {
  id: 'rail-chase',
  version: 1,
  title: '两车的中点什么时候相距 4 格',
  grade: '六年级',
  subject: '数学',
  category: '学而思',
  sequence: 1,
  mode: 'practice',
  book: 'g6-math-xueersi',
};
export const railApi = lessonApi(railChase.id);

// A child the test's server answers for, given the book that holds the rail
// chase.
export const railChild = {
  books: [
    givenBook({ id: railChase.book, name: '学而思', grade: '六年级', subject: '数学' }, [
      railChase,
    ]),
  ],
  opens: [railChase],
};

// Pushes a car far to the right along its track; the film halts the cars at
// the scene's stop however far the car is pushed.
async function push(page: Page, car: Locator) {
  const box = (await car.boundingBox())!;
  const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 20, y, { steps: 4 });
  await page.mouse.move(x + 600, y, { steps: 24 });
  await page.mouse.up();
}

// The film and the things a child touches in it, and what the owl says, in
// its subtitle in the picture.
export function railFilm(page: Page) {
  const film = page.getByRole('region', { name: '数轴追及互动短片' });
  return {
    film,
    yellow: film.getByRole('button', { name: /黄车/ }),
    blue: film.getByRole('button', { name: /蓝车/ }).first(),
    startGap: film.getByRole('button', { name: '两条线中间的这一段' }),
    rest: film.getByRole('button', { name: '起点的十格里还没变金的一段' }),
    gap: film.getByRole('button', { name: '两个点之间的空隙' }),
    four: film.getByRole('button', { name: '题目里的 4 格' }),
    blueAhead: film.getByRole('button', { name: '蓝车在前 4 格' }),
    yellowAhead: film.getByRole('button', { name: '黄车在前 4 格' }),
    caption: film.getByRole('region', { name: '猫头鹰博士的话' }).getByRole('status'),
  };
}

const tap = (target: Locator, says: string[]): FilmMove => ({
  move: () => target.click({ timeout: 20_000 }),
  says,
});

// Pushing the yellow car to the scene's stop.
function pushTo(page: Page, says: string[]): FilmMove {
  return { move: () => push(page, railFilm(page).yellow), says };
}

// Every move from the speeds to the question of both times, with the lines
// the owl says after each, by recording: the speeds, the two midpoints, the
// ten squares at the start, the pushes through each stop, the squares to
// win back, the squares after the cars pass, the 4 格 of the question and
// the two ways four squares can lie.
export function movesToTheAnswer(page: Page): FilmMove[] {
  const { yellow, blue, startGap, rest, gap, four, blueAhead, yellowAhead } = railFilm(page);
  return [
    tap(yellow, ['speed-yellow']),
    tap(blue, ['speed-blue', 'speed-both', 'question-ground', 'question-points']),
    tap(yellow, []),
    tap(blue, ['question-ask', 'question-four', 'question-steps', 'start-ground', 'start-ask']),
    tap(startGap, ['start-count', 'start-keep', 'one-ground', 'one-guess']),
    pushTo(page, ['one-stop', 'one-compare', 'one-gold', 'two-ground', 'two-ask']),
    pushTo(page, ['two-stop', 'three-ground', 'three-think']),
    pushTo(page, ['three-stop', 'name-ground', 'name-t', 'name-ask']),
    tap(rest, ['name-rest', 'name-check', 'catch-ground', 'catch-push']),
    pushTo(page, ['catch-meet', 'catch-ahead', 'past-ground']),
    pushTo(page, ['past-passed', 'past-minus']),
    tap(gap, ['past-why', 'past-sign', 'distance-ground', 'distance-push']),
    pushTo(page, [
      'distance-again',
      'distance-abs',
      'distance-check',
      'equation-ground',
      'equation-ask',
    ]),
    tap(four, ['equation-set', 'ways-ground', 'ways-ask']),
    tap(blueAhead, ['ways-blue']),
    tap(yellowAhead, ['ways-yellow', 'solve-ground', 'solve-ask']),
  ];
}

// After both times are answered: the check at each time, then the faster
// yellow car to its two stops and the reveal.
export function movesAfterTheAnswer(page: Page): FilmMove[] {
  return [
    pushTo(page, ['check-six', 'fourteen-ground']),
    pushTo(page, ['check-fourteen', 'check-two', 'vary-ground', 'vary-guess']),
    pushTo(page, ['vary-stop', 'vary-on']),
    pushTo(page, ['vary-stop-again', 'vary-why', 'vary-reveal']),
  ];
}

// Starts the film and plays it to the question of both times, hearing each
// line to its end before the next move.
export async function hearToTheAnswer(page: Page, narration: Listener) {
  await page.getByRole('button', { name: /开始短片/ }).click({ timeout: 30_000 });
  await narration.heard(['story-workshop', 'story-cars', 'story-start', 'speed-intro']);
  await play(movesToTheAnswer(page), ({ says }) => narration.heard(says));
}

// A signed-in child at the question of both times lights 6 and 14 and hands
// them in, as one whose browser has no microphone does, then checks them
// and plays the variation to its last line.
export async function answerAndHearTheRest(page: Page, narration: Listener) {
  const answer = page.getByRole('region', { name: '说出答案' });
  const numbers = answer.getByRole('group', { name: '点亮每一个答案' });
  await numbers.getByRole('button', { name: '6', exact: true }).click({ timeout: 30_000 });
  await numbers.getByRole('button', { name: '14', exact: true }).click();
  await answer.getByRole('button', { name: '交：6 和 14' }).click();
  await expect(railFilm(page).caption).toHaveText(/答对了/);
  await answer.getByRole('button', { name: '接着看' }).click();
  await narration.heard(['check-ground']);
  await play(movesAfterTheAnswer(page), ({ says }) => narration.heard(says));
}

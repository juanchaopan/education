import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, test, type Locator, type Page, type Request } from '@playwright/test';
import { gardenApi, round, signInAtTheGardenAnswer } from './child-at-the-answer.js';
import { gardenFilm } from './garden-film.js';
import { centreOf, holdWhile } from './hold.js';

// Speaking in the garden lesson with a real browser microphone. Chromium
// records from a sound file instead of a device: a second of tone, then
// three seconds of quiet, over and over. The child's session, saved place,
// answer round and the AI replies are answered by the test, so no database
// or AI key is needed; the recordings themselves are recorded and sent.

const voice = new URL('../test-results/hold-to-talk/voice.wav', import.meta.url);

// A mono 16-bit WAV of `toneSeconds` of a 440 Hz tone followed by silence.
function toneThenQuiet(toneSeconds: number, quietSeconds: number) {
  const rate = 16_000;
  const samples = Math.round(rate * (toneSeconds + quietSeconds));
  const wav = Buffer.alloc(44 + samples * 2);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(36 + samples * 2, 4);
  wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24);
  wav.writeUInt32LE(rate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++) {
    const sound = i < rate * toneSeconds ? Math.sin((2 * Math.PI * 440 * i) / rate) * 0.4 : 0;
    wav.writeInt16LE(Math.round(sound * 32_767), 44 + i * 2);
  }
  return wav;
}

mkdirSync(new URL('.', voice), { recursive: true });
writeFileSync(voice, toneThenQuiet(1, 3));

test.use({
  permissions: ['microphone'],
  launchOptions: {
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      `--use-file-for-fake-audio-capture=${decodeURIComponent(voice.pathname).replace(/^\/(\w:)/, '$1')}`,
    ],
  },
});

// What the lesson asked of the server, in order.
type Asked = { path: string; body?: Record<string, unknown> };

// A signed-in child whose saved place is the answer scene, and a server that
// hears each of `heard` in turn, the last one in every later recording, and
// answers every question.
async function serveLesson(page: Page, heard: readonly string[]) {
  const asked: Asked[] = [];
  let recordings = 0;
  const note = (request: Request) => {
    const body = request.postData();
    asked.push({
      path: new URL(request.url()).pathname,
      body: body ? JSON.parse(body) : undefined,
    });
  };
  await signInAtTheGardenAnswer(page);
  await page.route(`**${gardenApi}/answer`, (route) => {
    note(route.request());
    const body = route.request().postDataJSON() as { action?: string; attemptId?: string } | null;
    if (!body) return route.fulfill({ json: { round } });
    if (body.action === 'question') return route.fulfill({ json: { helped: true } });
    return route.fulfill({ json: { attemptId: body.attemptId, outcome: 'assisted' } });
  });
  await page.route(`**${gardenApi}/transcription`, (route) => {
    note(route.request());
    const text = heard[Math.min(recordings++, heard.length - 1)];
    return route.fulfill({ json: { status: 'ready', text } });
  });
  await page.route(`**${gardenApi}/question`, (route) => {
    note(route.request());
    return route.fulfill({
      json: { status: 'ready', source: 'ai', reply: '数一数右盘有几组黄瓜。' },
    });
  });
  return asked;
}

// Opens the lesson at the answer scene and waits until the answer heard in
// the first recording asks to be confirmed, so the page holds still.
async function openAnswer(page: Page) {
  await page.goto('/problems/garden-balance/1');
  await page.getByRole('button', { name: /接着上次的地方/ }).click({ timeout: 30_000 });
  const { film, caption } = gardenFilm(page);
  const answer = film.getByRole('region', { name: '说出答案' });
  await expect(answer.getByRole('button', { name: '说完了' })).toBeVisible({ timeout: 30_000 });
  await expect(caption).toContainText('我听到你说', { timeout: 15_000 });
  return { film, caption, answer };
}

const askButton = (film: Locator) => film.getByRole('button', { name: '按住问小兔' });
// The question box's voice meter while the microphone is held.
const listening = (page: Page) => page.getByRole('status').filter({ hasText: '我在听' });

test.skip(({ browserName }) => browserName !== 'chromium', 'Fake microphones are Chromium’s');

test('the answer is listened for by itself after the question, and confirmed before it is sent', async ({
  page,
}) => {
  test.setTimeout(90_000);
  const asked = await serveLesson(page, ['九根']);
  const { caption, answer } = await openAnswer(page);
  await expect(caption).toContainText('我听到你说「九根」，是 9 吗？');
  await expect(answer).toHaveText(/我听到\s*9\s*根/);
  expect(asked.filter(({ path }) => path.endsWith('/transcription'))).toHaveLength(1);
  await answer.getByRole('button', { name: '对，是 9' }).click();
  await expect(caption).toContainText('答对了');
  const submitted = asked.find(({ body }) => body?.action === 'submit');
  expect(submitted?.body).toMatchObject({ round, input: 9 });
});

test('a question is held to ask, read over and sent; while answering it is help first', async ({
  page,
}) => {
  test.setTimeout(90_000);
  const asked = await serveLesson(page, ['九根', '要数几组']);
  const { film, caption } = await openAnswer(page);
  // The answer steps aside while the question box takes its place.
  const again = film.getByRole('button', { name: '重说', includeHidden: true });

  // While the question is held, nothing else may open the microphone; the
  // finger may wander off the microphone. No send drop shows until it lets go.
  await holdWhile(page, askButton(film), async () => {
    await expect(listening(page)).toBeVisible();
    await expect(again).toBeDisabled();
    await expect(film.getByRole('button', { name: '发给小兔' })).toHaveCount(0);
    await page.mouse.move(5, 5);
    await page.waitForTimeout(1200);
  });
  const text = film.getByLabel('听到的话');
  await expect(text).toHaveValue('要数几组');
  await expect(again).toBeEnabled();
  await text.fill('要数几组黄瓜？');
  await film.getByRole('button', { name: '发给小兔' }).click();
  await expect(caption).toContainText('数一数右盘有几组黄瓜。');
  // Each request by its resource, and by its action for the answer resource.
  const order = asked.map(({ path, body }) =>
    [path.split('/').at(-1), body?.action].filter(Boolean).join(':'),
  );
  expect(order.slice(order.indexOf('answer:question'))).toEqual(['answer:question', 'question']);
  expect(asked.find(({ path }) => path.endsWith('/question'))?.body).toEqual({
    stepId: 'answer',
    text: '要数几组黄瓜？',
  });
});

test('a question read over can be dropped with the cross', async ({ page }) => {
  test.setTimeout(60_000);
  await serveLesson(page, ['九根', '为什么']);
  const { film } = await openAnswer(page);
  await holdWhile(page, askButton(film), () => page.waitForTimeout(1200));
  await expect(film.getByLabel('听到的话')).toHaveValue('为什么');
  await film.getByRole('button', { name: '不问了' }).click();
  await expect(film.getByLabel('听到的话')).toHaveCount(0);
  await expect(film.getByRole('region', { name: '说出答案' })).toBeVisible();
});

test('letting go too soon sends nothing and asks to hold the microphone', async ({ page }) => {
  test.setTimeout(60_000);
  const asked = await serveLesson(page, ['九根']);
  const { film, caption } = await openAnswer(page);
  await askButton(film).click();
  await expect(caption).toContainText('按住话筒，等声音条动起来再说话');
  expect(asked.filter(({ path }) => path.endsWith('/transcription'))).toHaveLength(1);
});

test('the question can be held from the keyboard', async ({ page }) => {
  test.setTimeout(60_000);
  await serveLesson(page, ['九根', '为什么苹果这边低']);
  const { film } = await openAnswer(page);
  await askButton(film).focus();
  await page.keyboard.down(' ');
  await expect(listening(page)).toBeVisible();
  await page.waitForTimeout(1200);
  await page.keyboard.up(' ');
  await expect(film.getByLabel('听到的话')).toHaveValue('为什么苹果这边低');
});

test('a finger held on the microphone asks, and a touch the browser takes away keeps what was said', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'Touch is tried on the phone');
  test.setTimeout(60_000);
  await serveLesson(page, ['九根', '为什么']);
  const { film } = await openAnswer(page);
  const point = await centreOf(askButton(film));
  const touch = await page.context().newCDPSession(page);
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
  await expect(listening(page)).toBeVisible();
  await page.waitForTimeout(1200);
  await touch.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await expect(film.getByLabel('听到的话')).toHaveValue('为什么');
});

test('the words to correct move above a phone keyboard', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'An on-screen keyboard is a phone’s');
  test.setTimeout(60_000);
  await serveLesson(page, ['九根', '为什么']);
  const { film } = await openAnswer(page);
  await holdWhile(page, askButton(film), () => page.waitForTimeout(1200));
  const text = film.getByLabel('听到的话');
  await text.click();
  // The phone's keyboard comes up over the bottom of the page, as the
  // visual viewport tells.
  const keyboard = 300;
  await page.evaluate((covered) => {
    const view = window.visualViewport!;
    Object.defineProperty(view, 'height', {
      configurable: true,
      value: window.innerHeight - covered,
    });
    view.dispatchEvent(new Event('resize'));
  }, keyboard);
  const above = page.viewportSize()!.height - keyboard;
  await expect
    .poll(async () => {
      const box = (await text.boundingBox())!;
      return box.y + box.height;
    })
    .toBeLessThanOrEqual(above);
  const send = (await film.getByRole('button', { name: '发给小兔' }).boundingBox())!;
  expect(send.y + send.height).toBeLessThanOrEqual(above);
  await expect(askButton(film)).toBeHidden();
});

import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, test, type Locator, type Page, type Request } from '@playwright/test';
import { gardenApi, round, signInAtTheGardenAnswer } from './child-at-the-answer.js';
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
  await page.route(`**${gardenApi}/feedback`, (route) => {
    note(route.request());
    const { stepId } = route.request().postDataJSON() as { stepId: string };
    return route.fulfill({
      json: {
        status: 'ready',
        source: 'ai',
        feedback: { status: 'needs-work', stepId, instruction: '数一数右盘有几组黄瓜。' },
      },
    });
  });
  return asked;
}

// Opens the lesson at the answer scene and waits until the answer heard in
// the first recording asks to be confirmed, so the page holds still.
async function openAnswer(page: Page) {
  await page.goto('/problems/garden-balance/1');
  await page.getByRole('button', { name: /接着上次的地方/ }).click({ timeout: 30_000 });
  const answer = page.getByRole('region', { name: '说出答案' });
  await expect(answer.getByRole('status')).toHaveText(/我在听/, { timeout: 30_000 });
  await expect(answer.getByRole('status')).toHaveText(/我听到你说/, { timeout: 15_000 });
  return { answer, question: page.getByRole('region', { name: '问问小兔' }) };
}

const askButton = (question: Locator) =>
  question.getByRole('button', { name: /按住问小兔|按住，再说一次/ });

test.skip(({ browserName }) => browserName !== 'chromium', 'Fake microphones are Chromium’s');

test('the answer is listened for by itself after the question, and confirmed before it is sent', async ({
  page,
}) => {
  test.setTimeout(90_000);
  const asked = await serveLesson(page, ['九根']);
  const { answer } = await openAnswer(page);
  await expect(answer.getByRole('status')).toHaveText('我听到你说「九根」，是 9 吗？');
  expect(asked.filter(({ path }) => path.endsWith('/transcription'))).toHaveLength(1);
  await answer.getByRole('button', { name: '对，是 9' }).click();
  await expect(answer.getByRole('status')).toHaveText(/答对了/);
  const submitted = asked.find(({ body }) => body?.action === 'submit');
  expect(submitted?.body).toMatchObject({ round, input: 9 });
});

test('a question is held to ask, read over and sent; while answering it is help first', async ({
  page,
}) => {
  test.setTimeout(90_000);
  const asked = await serveLesson(page, ['九根', '要数几组']);
  const { answer, question } = await openAnswer(page);
  const again = answer.getByRole('button', { name: '不对，再说一次' });

  // While the question is held, nothing else may open the microphone; the
  // finger may wander off the button.
  await holdWhile(page, askButton(question), async () => {
    await expect(question.getByRole('status')).toHaveText(/正在听。说完松开按钮/);
    await expect(again).toBeDisabled();
    await page.mouse.move(5, 5);
    await page.waitForTimeout(1200);
  });
  const text = question.getByLabel('听到的话');
  await expect(text).toHaveValue('要数几组');
  await expect(again).toBeEnabled();
  await text.fill('要数几组黄瓜？');
  await question.getByRole('button', { name: '发给小兔' }).click();
  await expect(question.getByRole('status')).toHaveText('数一数右盘有几组黄瓜。');
  const order = asked.map(({ path, body }) => body?.action ?? path.split('/').at(-1));
  expect(order.slice(order.indexOf('question'))).toEqual(['question', 'feedback']);
  expect(asked.find(({ path }) => path.endsWith('/feedback'))?.body).toMatchObject({
    stepId: 'answer',
    text: '要数几组黄瓜？',
  });
});

test('letting go too soon sends nothing and asks to hold the button', async ({ page }) => {
  test.setTimeout(60_000);
  const asked = await serveLesson(page, ['九根']);
  const { question } = await openAnswer(page);
  await askButton(question).click();
  await expect(question.getByRole('status')).toHaveText(/按住按钮，看到「正在听」再说话/);
  expect(asked.filter(({ path }) => path.endsWith('/transcription'))).toHaveLength(1);
});

test('the question can be held from the keyboard', async ({ page }) => {
  test.setTimeout(60_000);
  await serveLesson(page, ['九根', '为什么苹果这边低']);
  const { question } = await openAnswer(page);
  await askButton(question).focus();
  await page.keyboard.down(' ');
  await expect(question.getByRole('status')).toHaveText(/正在听/);
  await page.waitForTimeout(1200);
  await page.keyboard.up(' ');
  await expect(question.getByLabel('听到的话')).toHaveValue('为什么苹果这边低');
});

test('a finger held on the button asks, and a touch the browser takes away keeps what was said', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'Touch is tried on the phone');
  test.setTimeout(60_000);
  await serveLesson(page, ['九根', '为什么']);
  const { question } = await openAnswer(page);
  const point = await centreOf(askButton(question));
  const touch = await page.context().newCDPSession(page);
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
  await expect(question.getByRole('status')).toHaveText(/正在听/);
  await page.waitForTimeout(1200);
  await touch.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await expect(question.getByLabel('听到的话')).toHaveValue('为什么');
});

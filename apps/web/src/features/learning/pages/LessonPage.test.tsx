import type { SavedDraft } from '@education/contracts';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { usePageReadiness } from '../../../shared/lib/reload-readiness';
import { forgetFullscreen } from '../../../test/fake-fullscreen';
import { fixtureLesson } from '../../../test/lesson-fixture';
import { pageWrapper } from '../../../test/page-wrapper';
import { lessonPage } from './LessonPage';

const FixturePage = lessonPage(fixtureLesson);

const draftPath = '/api/v1/problems/fixture/1/draft';
const savedAt = (stepId: string): SavedDraft => ({
  content: { stepId, drawing: [] },
  revision: '33333333-3333-3333-3333-333333333333',
  expiresAt: '2026-11-14T00:00:00.000Z',
});

// The server as the lesson sees it: every recording arrives, the draft
// holds `saved` and takes whatever is saved unless saving fails, and nothing
// else is there.
function serve(saved: SavedDraft | null, { savingFails = false } = {}) {
  const fetch = vi.fn(async (path: string, init?: RequestInit) => {
    if (path.endsWith('.mp3')) return new Response('sound');
    if (path !== draftPath) return new Response(null, { status: 404 });
    if (!init?.body) return Response.json({ draft: saved });
    if (savingFails) return new Response(null, { status: 503 });
    const { content } = JSON.parse(String(init.body)) as { content: SavedDraft['content'] };
    return Response.json({ draft: { ...savedAt(content.stepId), content } });
  });
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

// The scenes the page has asked the server to save, in order.
const savedSteps = (fetch: ReturnType<typeof serve>) =>
  fetch.mock.calls
    .filter(([path, init]) => path === draftPath && init?.body)
    .map(([, init]) => JSON.parse(String(init!.body)).content.stepId);

// Lets every reply already sent reach the page.
const repliesLand = () => act(() => new Promise((landed) => setTimeout(landed, 0)));

// How the page stands toward a reload, as the update check reads it.
function PageReadiness() {
  return <output aria-label="刷新">{usePageReadiness().readiness}</output>;
}

function open(csrf?: string) {
  const Page = pageWrapper();
  render(
    <MemoryRouter>
      <Page>
        <FixturePage csrf={csrf} />
        <PageReadiness />
      </Page>
    </MemoryRouter>,
  );
}

const film = () => screen.getByRole('region', { name: '示例互动短片' });
// What the teacher is saying, in its subtitle in the picture.
const subtitle = () => within(film()).getByRole('region', { name: '小兔的话' });
const caption = () => within(subtitle()).getByRole('status');
// The draft's notice in the picture, once it shows.
const draftNotice = () => screen.findByRole('complementary', { name: '学习草稿' });
const readiness = () => screen.getByRole('status', { name: '刷新' });
const start = async (name: RegExp) => userEvent.click(await screen.findByRole('button', { name }));

// The lesson's one player, made by the page, which a test plays to its end.
let players: HTMLAudioElement[] = [];
async function hearLineToEnd() {
  const player = players[0]!;
  await act(async () => {
    player.dispatchEvent(new Event('playing'));
    player.dispatchEvent(new Event('ended'));
  });
}

beforeEach(() => {
  players = [];
  const Player = window.Audio;
  vi.stubGlobal(
    'Audio',
    class extends Player {
      constructor(source?: string) {
        super(source);
        players.push(this);
      }
    },
  );
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
});

// The lesson is closed while the player is still faked, as leaving it pauses
// the teacher's voice.
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  forgetFullscreen();
  localStorage.clear();
});

it('lets a visitor play the film without saving anything, and asks them to sign in', async () => {
  const fetch = serve(null);
  open();
  await start(/开始短片/);
  expect(caption()).toHaveTextContent('看看这颗小石子。');
  expect(within(film()).getByRole('link', { name: '去孩子空间登录' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '按住问小兔' })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: '小石子' }));
  expect(caption()).toHaveTextContent('一共有几颗？');
  expect(screen.queryByRole('region', { name: '说出答案' })).not.toBeInTheDocument();
  expect(fetch.mock.calls.some(([path]) => path === draftPath)).toBe(false);
});

it('asks for the whole screen as the child starts the film', async () => {
  serve(null);
  const request = vi.fn().mockResolvedValue(undefined);
  document.documentElement.requestFullscreen = request;
  open();
  await start(/开始短片/);
  expect(request).toHaveBeenCalledOnce();
});

it('starts the film all the same when the browser refuses the whole screen', async () => {
  serve(null);
  document.documentElement.requestFullscreen = vi
    .fn()
    .mockRejectedValue(new TypeError('Permissions check failed'));
  open();
  await start(/开始短片/);
  expect(caption()).toHaveTextContent('看看这颗小石子。');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('lays every control into the picture, and says for a moment that the scene is saved', async () => {
  serve(null);
  open('token');
  await start(/开始短片/);
  const picture = film();
  for (const name of ['重听这一句', '字幕', '声音', '按住问小兔'])
    expect(picture).toContainElement(screen.getByRole('button', { name }));
  const notice = await draftNotice();
  expect(picture).toContainElement(notice);
  expect(notice).toHaveTextContent('已保存');
});

it('saves each scene a signed-in child reaches and asks about the scene on screen', async () => {
  const fetch = serve(null);
  open('token');
  await start(/开始短片/);
  expect(screen.getByRole('button', { name: '按住问小兔' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: '小石子' }));
  expect(caption()).toHaveTextContent('一共有几颗？');
  expect(screen.getByRole('button', { name: '给我一个提示，还有 1 个' })).toBeInTheDocument();
  await waitFor(() => expect(savedSteps(fetch)).toEqual(['look', 'count']));
});

it('tells the child the lesson picked up where they left it, and starts over when asked', async () => {
  const fetch = serve(savedAt('count'));
  open('token');
  await start(/接着上次的地方/);
  const notice = await draftNotice();
  expect(notice).toHaveTextContent('从上次的地方继续');
  // The scene picked up is saved again before the child chooses.
  await waitFor(() => expect(savedSteps(fetch)).toEqual(['count']));
  await repliesLand();
  await userEvent.click(within(notice).getByRole('button', { name: '从头做' }));
  expect(caption()).toHaveTextContent('看看这颗小石子。');
  expect(screen.queryByText('从上次的地方继续')).not.toBeInTheDocument();
  await waitFor(() => expect(savedSteps(fetch)).toEqual(['count', 'look']));
});

it('listens for the answer by itself once the question is heard, and offers numbers without a microphone', async () => {
  serve(savedAt('count'));
  open('token');
  await start(/接着上次的地方/);
  expect(caption()).toHaveTextContent('一共有几颗？');
  expect(screen.queryByRole('region', { name: '说出答案' })).not.toBeInTheDocument();
  await hearLineToEnd();
  const answer = await screen.findByRole('region', { name: '说出答案' });
  expect(within(answer).getByRole('group', { name: '点一个数字回答' })).toBeInTheDocument();
  expect(caption()).toHaveTextContent('这台设备现在不能录音。');
});

it('hides the narrated lines while the captions are off, and keeps that on the device', async () => {
  serve(null);
  open();
  await start(/开始短片/);
  await userEvent.click(screen.getByRole('button', { name: '字幕', pressed: true }));
  expect(caption()).toBeEmptyDOMElement();
  cleanup();
  open();
  await start(/开始短片/);
  expect(screen.getByRole('button', { name: '字幕', pressed: false })).toBeInTheDocument();
  expect(caption()).toBeEmptyDOMElement();
});

it('plays the lines without sound once the sound is off, with the captions on', async () => {
  serve(null);
  open();
  await start(/开始短片/);
  await userEvent.click(screen.getByRole('button', { name: '字幕', pressed: true }));
  await userEvent.click(screen.getByRole('button', { name: '声音', pressed: true }));
  expect(players[0]!.muted).toBe(true);
  expect(screen.getByRole('button', { name: '字幕', pressed: true })).toBeDisabled();
  expect(caption()).toHaveTextContent('看看这颗小石子。');
});

it('starts over at the first scene when the saved step is not a later scene', async () => {
  serve(savedAt('somewhere-else'));
  open('token');
  await start(/开始短片/);
  expect(caption()).toHaveTextContent('看看这颗小石子。');
});

it('keeps the notice while the place reached is unsaved, and holds a reload until then', async () => {
  serve(null, { savingFails: true });
  open('token');
  await start(/开始短片/);
  expect(readiness()).toHaveTextContent('playing');
  expect(await draftNotice()).toHaveTextContent('还没同步');
  expect(readiness()).toHaveTextContent('playing');
  await hearLineToEnd();
  await waitFor(() => expect(readiness()).toHaveTextContent('unsaved'));
});

it('lets a reload go ahead once a visitor has heard the line to its end', async () => {
  serve(null);
  open();
  await start(/开始短片/);
  expect(readiness()).toHaveTextContent('playing');
  await hearLineToEnd();
  await waitFor(() => expect(readiness()).toHaveTextContent('ready'));
});

import type { SavedDraft } from '@education/contracts';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { usePageReadiness } from '../../../shared/lib/reload-readiness';
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

const savedSteps = (fetch: ReturnType<typeof serve>) =>
  fetch.mock.calls
    .filter(([path, init]) => path === draftPath && init?.body)
    .map(([, init]) => JSON.parse(String(init!.body)).content.stepId);

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

// What the teacher is saying in the film.
const caption = () =>
  within(screen.getByRole('region', { name: '示例互动短片' })).getByRole('status');
const readiness = () => screen.getByRole('status', { name: '刷新' });

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
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }));
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
});

it('lets a visitor play the film without saving anything, and asks them to sign in', async () => {
  const fetch = serve(null);
  open();
  await userEvent.click(await screen.findByRole('button', { name: /开始短片/ }));
  expect(caption()).toHaveTextContent('看看这颗小石子。');
  expect(screen.getByRole('link', { name: '去孩子空间登录' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: '小石子' }));
  expect(caption()).toHaveTextContent('一共有几颗？');
  expect(screen.queryByRole('region', { name: '说出答案' })).not.toBeInTheDocument();
  expect(fetch.mock.calls.some(([path]) => path === draftPath)).toBe(false);
});

it('saves each scene a signed-in child reaches and asks about the scene on screen', async () => {
  const fetch = serve(null);
  open('token');
  await userEvent.click(await screen.findByRole('button', { name: /开始短片/ }));
  expect(screen.getByRole('region', { name: '问问小猫头鹰' })).toBeInTheDocument();
  expect(screen.getByRole('complementary', { name: '学习草稿' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: '小石子' }));
  expect(await screen.findByRole('region', { name: '说出答案' })).toHaveTextContent(
    '一共有几颗小石子？',
  );
  await waitFor(() => expect(savedSteps(fetch)).toEqual(['look', 'count']));
});

it('resumes a signed-in child in the answer scene, where the child can also ask', async () => {
  serve(savedAt('count'));
  open('token');
  await userEvent.click(await screen.findByRole('button', { name: /接着上次的地方/ }));
  expect(caption()).toHaveTextContent('一共有几颗？');
  expect(screen.getByRole('region', { name: '说出答案' })).toBeInTheDocument();
  expect(screen.getByRole('region', { name: '问问小猫头鹰' })).toBeInTheDocument();
});

it('listens for the answer by itself once the question is heard, and offers numbers without a microphone', async () => {
  serve(savedAt('count'));
  open('token');
  await userEvent.click(await screen.findByRole('button', { name: /接着上次的地方/ }));
  const answer = screen.getByRole('region', { name: '说出答案' });
  expect(within(answer).getByRole('status')).toHaveTextContent('听完这句话，就可以说出答案了。');
  expect(within(answer).queryByRole('button')).toBeNull();
  await hearLineToEnd();
  expect(await within(answer).findByRole('group', { name: '点一个数字回答' })).toBeInTheDocument();
  expect(within(answer).getByRole('status')).toHaveTextContent('这台设备现在不能录音。');
});

it('starts over at the first scene when the saved step is not a later scene', async () => {
  serve(savedAt('somewhere-else'));
  open('token');
  await userEvent.click(await screen.findByRole('button', { name: /开始短片/ }));
  expect(caption()).toHaveTextContent('看看这颗小石子。');
});

it('holds a reload while the film plays, and then while the place reached is unsaved', async () => {
  serve(null, { savingFails: true });
  open('token');
  await userEvent.click(await screen.findByRole('button', { name: /开始短片/ }));
  expect(readiness()).toHaveTextContent('playing');
  await waitFor(() =>
    expect(screen.getByRole('complementary', { name: '学习草稿' })).toHaveTextContent('还没同步'),
  );
  expect(readiness()).toHaveTextContent('playing');
  await hearLineToEnd();
  await waitFor(() => expect(readiness()).toHaveTextContent('unsaved'));
});

it('lets a reload go ahead once a visitor has heard the line to its end', async () => {
  serve(null);
  open();
  await userEvent.click(await screen.findByRole('button', { name: /开始短片/ }));
  expect(readiness()).toHaveTextContent('playing');
  await hearLineToEnd();
  await waitFor(() => expect(readiness()).toHaveTextContent('ready'));
});

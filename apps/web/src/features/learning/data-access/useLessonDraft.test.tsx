import type { SavedDraft } from '@education/contracts';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { usePageReadiness } from '../../../shared/lib/reload-readiness';
import { pageWrapper } from '../../../test/page-wrapper';
import { queryWrapper } from '../../../test/query-wrapper';
import { useLessonDraft } from './useLessonDraft';

const initial = { stepId: 'start', drawing: [] };
const edit = { stepId: 'compare', drawing: [[{ x: 0.1, y: 0.2 }]] };
const remote: SavedDraft = {
  content: { stepId: 'explain', drawing: [] },
  revision: '22222222-2222-2222-2222-222222222222',
  expiresAt: '2026-11-14T00:00:00.000Z',
};
const reply = (draft: typeof remote | null, status = 200) => Response.json({ draft }, { status });

afterEach(() => vi.unstubAllGlobals());

function setup(fetch: ReturnType<typeof vi.fn>) {
  vi.stubGlobal('fetch', fetch);
  return renderHook(({ csrf }) => useLessonDraft({ id: 'fixture', version: 1, csrf }, initial), {
    initialProps: { csrf: 'one' },
    wrapper: queryWrapper(),
  });
}

// The draft on a page that reports what a reload would lose, with the page's
// own view of it.
function setupOnPage(fetch: ReturnType<typeof vi.fn>) {
  vi.stubGlobal('fetch', fetch);
  return renderHook(
    () => ({
      draft: useLessonDraft({ id: 'fixture', version: 1, csrf: 'one' }, initial),
      page: usePageReadiness(),
    }),
    { wrapper: pageWrapper() },
  );
}

it('keeps ink on failure, retries it, and restores the acknowledged step on return', async () => {
  const saved = { ...remote, content: edit };
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(reply(null))
    .mockRejectedValueOnce(new TypeError())
    .mockResolvedValueOnce(reply(saved))
    .mockResolvedValueOnce(reply(saved));
  const { result, unmount } = setup(fetch);
  await waitFor(() => expect(result.current.status).toBe('clean'));
  act(() => result.current.edit(edit));
  await act(async () => {
    await result.current.save();
  });
  expect(result.current.status).toBe('unsynced');
  expect(result.current.content).toEqual(edit);
  await act(async () => {
    await result.current.save();
  });
  expect(result.current.status).toBe('saved');
  expect(JSON.parse(fetch.mock.calls[2]![1].body)).toEqual({
    action: 'save',
    revision: null,
    content: edit,
  });
  unmount();
  const reopened = setup(fetch).result;
  await waitFor(() => expect(reopened.current.content).toEqual(edit));
});

it('keeps edits during a conflict until an explicit choice and rebases only after that choice', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(reply(null))
    .mockResolvedValueOnce(reply(remote, 409))
    .mockResolvedValueOnce(reply({ ...remote, content: edit }));
  const { result } = setup(fetch);
  await waitFor(() => expect(result.current.status).toBe('clean'));
  act(() => result.current.edit(edit));
  await act(async () => {
    await result.current.save();
  });
  expect(result.current.status).toBe('conflict');
  expect(result.current.content).toEqual(edit);
  await act(async () => {
    await result.current.save();
  });
  expect(fetch).toHaveBeenCalledTimes(2);
  act(() => result.current.resolve('keep'));
  expect(result.current.content).toEqual(edit);
  await act(async () => {
    await result.current.save();
  });
  expect(JSON.parse(fetch.mock.calls[2]![1].body).revision).toBe(remote.revision);
});

it('can use the remote version, and does not show the previous account’s draft after identity changes', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(reply(null))
    .mockResolvedValueOnce(reply(remote, 409))
    .mockResolvedValueOnce(reply(null));
  const { result, rerender } = setup(fetch);
  await waitFor(() => expect(result.current.status).toBe('clean'));
  act(() => result.current.edit(edit));
  await act(async () => {
    await result.current.save();
  });
  act(() => result.current.resolve('remote'));
  expect(result.current.content).toEqual(remote.content);
  rerender({ csrf: 'two' });
  expect(result.current.content).toEqual(initial);
  await waitFor(() => expect(result.current.status).toBe('clean'));
  expect(fetch.mock.calls[2]![1].headers['X-CSRF-Token']).toBe('two');
});

it('retains changes made while a save is in flight and serializes duplicate commands', async () => {
  let finish!: (response: Response) => void;
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(reply(null))
    .mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        }),
    );
  const { result } = setup(fetch);
  await waitFor(() => expect(result.current.status).toBe('clean'));
  act(() => result.current.edit(edit));
  const later = { ...edit, stepId: 'later' };
  await act(async () => {
    const saving = result.current.save();
    await result.current.save();
    result.current.edit(later);
    finish(reply({ ...remote, content: edit }));
    await saving;
  });
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(result.current.content).toEqual(later);
  expect(result.current.status).toBe('unsynced');
});

it('records and saves a step reached in one call, on top of the saved revision', async () => {
  const reached = { stepId: 'exchange', drawing: [] };
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(reply(remote))
    .mockResolvedValueOnce(reply({ ...remote, content: reached }));
  const { result } = setup(fetch);
  await waitFor(() => expect(result.current.status).toBe('saved'));
  await act(async () => {
    await result.current.saveAs(reached);
  });
  expect(JSON.parse(fetch.mock.calls[1]![1].body)).toEqual({
    action: 'save',
    revision: remote.revision,
    content: reached,
  });
  expect(result.current.content).toEqual(reached);
  expect(result.current.status).toBe('saved');
});

it('tells the page an edit a reload would lose, and saves it when the page asks', async () => {
  let finish!: (response: Response) => void;
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(reply(null))
    .mockRejectedValueOnce(new TypeError())
    .mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        }),
    );
  const { result } = setupOnPage(fetch);
  await waitFor(() => expect(result.current.draft.status).toBe('clean'));
  expect(result.current.page.readiness).toBe('ready');
  act(() => result.current.draft.edit(edit));
  await waitFor(() => expect(result.current.page.readiness).toBe('unsaved'));
  await act(async () => {
    await result.current.draft.save();
  });
  expect(result.current.page.readiness).toBe('unsaved');
  act(() => result.current.page.saveUnsaved());
  await waitFor(() => expect(result.current.page.readiness).toBe('saving'));
  expect(JSON.parse(fetch.mock.calls[2]![1].body).content).toEqual(edit);
  await act(async () => finish(reply({ ...remote, content: edit })));
  await waitFor(() => expect(result.current.page.readiness).toBe('ready'));
  expect(result.current.draft.status).toBe('saved');
});

it('sends a discard that failed again as a discard when the page asks, never as a save', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(reply(remote))
    .mockRejectedValueOnce(new TypeError())
    .mockResolvedValueOnce(reply(null));
  const { result } = setupOnPage(fetch);
  await waitFor(() => expect(result.current.draft.status).toBe('saved'));
  await act(async () => {
    await result.current.draft.discard();
  });
  await waitFor(() => expect(result.current.page.readiness).toBe('unsaved'));
  act(() => result.current.page.saveUnsaved());
  await waitFor(() => expect(result.current.page.readiness).toBe('ready'));
  expect(JSON.parse(fetch.mock.calls[2]![1].body)).toEqual({
    action: 'discard',
    revision: remote.revision,
  });
  expect(result.current.draft.status).toBe('clean');
});

it('tells the page an edit kept through a conflict is unsaved until the child chooses', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(reply(null))
    .mockResolvedValueOnce(reply(remote, 409));
  const { result } = setupOnPage(fetch);
  await waitFor(() => expect(result.current.draft.status).toBe('clean'));
  act(() => result.current.draft.edit(edit));
  await act(async () => {
    await result.current.draft.save();
  });
  expect(result.current.draft.status).toBe('conflict');
  await waitFor(() => expect(result.current.page.readiness).toBe('unsaved'));
  act(() => result.current.page.saveUnsaved());
  expect(fetch).toHaveBeenCalledTimes(2);
  act(() => result.current.draft.resolve('remote'));
  await waitFor(() => expect(result.current.page.readiness).toBe('ready'));
});

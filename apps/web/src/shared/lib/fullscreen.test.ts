import { afterEach, expect, it, vi } from 'vitest';
import { forgetFullscreen, inFullscreen } from '../../test/fake-fullscreen';
import { enterFullscreen, leaveFullscreen } from './fullscreen';

const root = document.documentElement;

// A request the test answers itself: `grant` puts the page in full screen.
function heldRequest() {
  let grant!: () => void;
  const request = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        grant = () => {
          inFullscreen(root);
          resolve();
        };
      }),
  );
  return { request, grant: () => grant() };
}

afterEach(async () => {
  forgetFullscreen();
  await leaveFullscreen();
});

it('asks for the whole page to go full screen', () => {
  const request = vi.fn().mockResolvedValue(undefined);
  root.requestFullscreen = request;
  enterFullscreen();
  expect(request).toHaveBeenCalledWith({ navigationUI: 'hide' });
});

it('says nothing when the browser refuses or cannot go full screen', async () => {
  root.requestFullscreen = vi.fn().mockRejectedValue(new TypeError('Permissions check failed'));
  expect(() => enterFullscreen()).not.toThrow();
  await leaveFullscreen();
  root.requestFullscreen = vi.fn(() => {
    throw new TypeError('Not allowed');
  });
  expect(() => enterFullscreen()).not.toThrow();
  delete (root as Partial<Element>).requestFullscreen;
  expect(() => enterFullscreen()).not.toThrow();
});

it('does not ask again while the page is full screen or a request is being answered', () => {
  const { request, grant } = heldRequest();
  root.requestFullscreen = request;
  enterFullscreen();
  enterFullscreen();
  expect(request).toHaveBeenCalledOnce();
  grant();
  enterFullscreen();
  expect(request).toHaveBeenCalledOnce();
});

it('leaves full screen only when the page is in it, and settles even if refused', async () => {
  const exit = vi.fn().mockRejectedValue(new TypeError('Not in fullscreen'));
  document.exitFullscreen = exit;
  await leaveFullscreen();
  expect(exit).not.toHaveBeenCalled();
  inFullscreen(root);
  await expect(leaveFullscreen()).resolves.toBeUndefined();
  expect(exit).toHaveBeenCalledOnce();
});

it('leaves full screen that a request still on its way brings in', async () => {
  const { request, grant } = heldRequest();
  root.requestFullscreen = request;
  const exit = vi.fn(async () => inFullscreen(null));
  document.exitFullscreen = exit;
  enterFullscreen();
  const leaving = leaveFullscreen();
  grant();
  await leaving;
  expect(exit).toHaveBeenCalledOnce();
});

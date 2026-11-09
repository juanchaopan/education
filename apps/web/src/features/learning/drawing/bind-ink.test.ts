import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { bindInk } from './bind-ink';

// A canvas context that only records the ink it was last given, enough for
// bindInk to paint a drawing in jsdom.
function fakeContext(canvas: HTMLCanvasElement) {
  const noop = () => {};
  return {
    canvas,
    fillStyle: '',
    strokeStyle: '',
    beginPath: noop,
    arc: noop,
    fill: noop,
    moveTo: noop,
    lineTo: noop,
    stroke: noop,
  };
}

let canvas: HTMLCanvasElement;
let context: ReturnType<typeof fakeContext>;
let unbind: (() => void) | undefined;

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  canvas = document.createElement('canvas');
  context = fakeContext(canvas);
  vi.spyOn(canvas, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
  canvas.style.color = 'rgb(51, 40, 29)';
  document.body.append(canvas);
  document.documentElement.dataset.theme = 'day';
});

afterEach(() => {
  unbind?.();
  unbind = undefined;
  canvas.remove();
  delete document.documentElement.dataset.theme;
  vi.unstubAllGlobals();
});

const drawing = [[{ x: 0.2, y: 0.2 }], [{ x: 0.5, y: 0.5 }]];

it('paints the drawing again in the new ink when the theme changes', async () => {
  unbind = bindInk(canvas, drawing, vi.fn());
  expect(context.strokeStyle).toBe('rgb(51, 40, 29)');
  canvas.style.color = 'rgb(246, 234, 210)';
  document.documentElement.dataset.theme = 'night';
  await Promise.resolve();
  expect(context.strokeStyle).toBe('rgb(246, 234, 210)');
});

it('paints it again once a fading switch has settled on the new ink', () => {
  unbind = bindInk(canvas, drawing, vi.fn());
  canvas.style.color = 'rgb(246, 234, 210)';
  canvas.dispatchEvent(Object.assign(new Event('transitionend'), { propertyName: 'color' }));
  expect(context.strokeStyle).toBe('rgb(246, 234, 210)');
});

it('stops watching the theme once the board lets go of the canvas', async () => {
  bindInk(canvas, drawing, vi.fn())?.();
  canvas.style.color = 'rgb(246, 234, 210)';
  document.documentElement.dataset.theme = 'night';
  await Promise.resolve();
  expect(context.strokeStyle).toBe('rgb(51, 40, 29)');
});

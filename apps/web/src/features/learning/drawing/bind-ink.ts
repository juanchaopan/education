import { normalizedPoint, paintStroke, type Drawing } from './ink';

type Point = Drawing[number][number];

function fitInkCanvas(context: CanvasRenderingContext2D) {
  const { canvas } = context;
  const { width, height } = canvas.getBoundingClientRect();
  const scale = Math.min(window.devicePixelRatio, 2048 / Math.max(width, height));
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  context.fillStyle = context.strokeStyle = getComputedStyle(canvas).color;
}

export function bindInk(
  canvas: HTMLCanvasElement,
  drawing: Drawing,
  onStroke: (stroke: Drawing[number]) => void,
) {
  const context = canvas.getContext('2d');
  if (!context) return;
  const listeners = new AbortController();
  const options = { signal: listeners.signal };
  let active: { pointerId: number; points: Point[] } | undefined;

  const redraw = () => {
    fitInkCanvas(context);
    for (const stroke of drawing) paintStroke(context, stroke);
    if (active) paintStroke(context, active.points);
  };

  const start = (event: PointerEvent) => {
    if (active || !event.isPrimary || event.button !== 0) return;
    const point = normalizedPoint(canvas.getBoundingClientRect(), event);
    if (!point) return;
    canvas.setPointerCapture(event.pointerId);
    active = { pointerId: event.pointerId, points: [point] };
    paintStroke(context, active.points);
  };

  const move = (event: PointerEvent) => {
    if (active?.pointerId !== event.pointerId) return;
    const point = normalizedPoint(canvas.getBoundingClientRect(), event);
    const previous = active.points.at(-1);
    if (!point || !previous || (point.x === previous.x && point.y === previous.y)) return;
    active.points.push(point);
    paintStroke(context, [previous, point]);
  };

  function finish(event: PointerEvent) {
    if (active?.pointerId !== event.pointerId) return;
    if (event.type === 'pointerup') {
      move(event);
      const { points } = active;
      active = undefined;
      onStroke(points);
      return;
    }
    active = undefined;
    redraw();
  }

  canvas.addEventListener('pointerdown', start, options);
  canvas.addEventListener('pointermove', move, options);
  canvas.addEventListener('pointerup', finish, options);
  canvas.addEventListener('pointercancel', finish, options);
  canvas.addEventListener('lostpointercapture', finish, options);
  const observer = new ResizeObserver(redraw);
  observer.observe(canvas);
  window.addEventListener('resize', redraw, options);
  redraw();

  return () => {
    listeners.abort();
    observer.disconnect();
    if (active && canvas.hasPointerCapture(active.pointerId)) {
      canvas.releasePointerCapture(active.pointerId);
    }
  };
}

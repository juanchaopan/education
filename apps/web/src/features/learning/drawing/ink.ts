import { drawingSheetHeight, drawingSheetWidth } from '@education/contracts';

type InkPoint = Readonly<{ x: number; y: number }>;
type Stroke = readonly InkPoint[];
export type Drawing = readonly Stroke[];

export const sheetWidth = drawingSheetWidth;
export const sheetHeight = drawingSheetHeight;

const clamp = (value: number) => Math.max(0, Math.min(1, value));

export function normalizedPoint(
  bounds: Pick<DOMRectReadOnly, 'left' | 'top' | 'width' | 'height'>,
  event: Pick<PointerEvent, 'clientX' | 'clientY'>,
): InkPoint | undefined {
  if (!bounds.width || !bounds.height) return;
  return {
    x: clamp((event.clientX - bounds.left) / bounds.width),
    y: clamp((event.clientY - bounds.top) / bounds.height),
  };
}

export function paintStroke(context: CanvasRenderingContext2D, stroke: Stroke) {
  const [first, ...rest] = stroke;
  if (!first) return;
  const { width, height } = context.canvas;
  const thickness = width / 160;
  context.beginPath();
  if (rest.length === 0) {
    context.arc(first.x * width, first.y * height, thickness / 2, 0, 2 * Math.PI);
    context.fill();
    return;
  }
  context.lineWidth = thickness;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.moveTo(first.x * width, first.y * height);
  for (const point of rest) context.lineTo(point.x * width, point.y * height);
  context.stroke();
}

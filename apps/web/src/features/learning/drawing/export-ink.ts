import { feedbackImageMaxBytes } from '@education/contracts';
import { paintStroke, sheetHeight, sheetWidth, type Drawing } from './ink';

function encodePng(drawing: Drawing, scale: number): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  canvas.width = sheetWidth * scale;
  canvas.height = sheetHeight * scale;
  const context = canvas.getContext('2d');
  if (!context) return Promise.resolve(null);
  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#000';
  for (const stroke of drawing) paintStroke(context, stroke);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

// Called on demand with the same snapshot used to position feedback.
export async function exportInk(drawing: Drawing): Promise<Blob | undefined> {
  if (!drawing.length) return;
  for (const scale of [1, 0.5]) {
    const blob = await encodePng(drawing, scale);
    if (blob && blob.size > 0 && blob.size <= feedbackImageMaxBytes) return blob;
  }
}

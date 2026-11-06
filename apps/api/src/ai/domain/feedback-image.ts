import { drawingSheetHeight, drawingSheetWidth, feedbackImageMaxBytes } from '@education/contracts';

const MIN_SIDE = 64;
const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const HEADER_BYTES = 24;
// Enough base64 characters to cover the header, so the image is never decoded in full.
const HEADER_CHARS = (HEADER_BYTES / 3) * 4;

function decodedLength(base64: string) {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return (base64.length / 4) * 3 - padding;
}

// Returns the image as a data URL when it is a PNG within the agreed size and
// dimensions, and nothing otherwise. Only the header is read, never decoded.
export function feedbackImageUrl(base64: string): string | undefined {
  if (base64.length % 4 !== 0) return;
  const length = decodedLength(base64);
  if (length < HEADER_BYTES || length > feedbackImageMaxBytes) return;
  const header = Buffer.from(base64.slice(0, HEADER_CHARS), 'base64');
  if (!header.subarray(0, SIGNATURE.length).equals(SIGNATURE)) return;
  if (header.subarray(12, 16).toString('latin1') !== 'IHDR') return;
  const width = header.readUInt32BE(16);
  const height = header.readUInt32BE(20);
  if (width < MIN_SIDE || height < MIN_SIDE) return;
  if (width > drawingSheetWidth || height > drawingSheetHeight) return;
  return `data:image/png;base64,${base64}`;
}

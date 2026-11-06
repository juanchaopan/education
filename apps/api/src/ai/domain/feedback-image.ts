import { feedbackImageMaxBytes } from '@education/contracts';

// The drawing sheet is exported at most at this size; a smaller image stays readable
// when scaled by half, a larger one only costs more.
const MAX_WIDTH = 1024;
const MAX_HEIGHT = 768;
const MIN_SIDE = 64;
const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const HEADER_BYTES = 24;

// Returns the image as a data URL when it is a PNG within the agreed size and
// dimensions, and nothing otherwise. Only the header is read, never decoded.
export function feedbackImageUrl(base64: string): string | undefined {
  const bytes = Buffer.from(base64, 'base64');
  if (bytes.length < HEADER_BYTES || bytes.length > feedbackImageMaxBytes) return;
  if (!bytes.subarray(0, SIGNATURE.length).equals(SIGNATURE)) return;
  if (bytes.subarray(12, 16).toString('latin1') !== 'IHDR') return;
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (width < MIN_SIDE || height < MIN_SIDE || width > MAX_WIDTH || height > MAX_HEIGHT) return;
  return `data:image/png;base64,${base64}`;
}

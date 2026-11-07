import { drawingSheetHeight, drawingSheetWidth, feedbackImageMaxBytes } from '@education/contracts';

const MIN_SIDE = 64;
const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
// A PNG ends with an empty IEND chunk: length 0, the name, and its fixed checksum.
const END_CHUNK = Buffer.from('0000000049454e44ae426082', 'hex');
const HEADER_BYTES = 24;
// Base64 characters covering the header and the end chunk, so the image is never decoded in full.
const HEADER_CHARS = (HEADER_BYTES / 3) * 4;
const TAIL_CHARS = (END_CHUNK.length / 3) * 4 + 4;

function decodedLength(base64: string) {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return (base64.length / 4) * 3 - padding;
}

function hasReadableHeader(base64: string) {
  const header = Buffer.from(base64.slice(0, HEADER_CHARS), 'base64');
  if (!header.subarray(0, SIGNATURE.length).equals(SIGNATURE)) return false;
  if (header.subarray(12, 16).toString('latin1') !== 'IHDR') return false;
  const width = header.readUInt32BE(16);
  const height = header.readUInt32BE(20);
  return (
    width >= MIN_SIDE &&
    height >= MIN_SIDE &&
    width <= drawingSheetWidth &&
    height <= drawingSheetHeight
  );
}

function hasEndChunk(base64: string) {
  const tail = Buffer.from(base64.slice(-TAIL_CHARS), 'base64');
  return tail.subarray(tail.length - END_CHUNK.length).equals(END_CHUNK);
}

// Returns the image as a data URL when it is a PNG within the agreed size and
// dimensions that has both its header and its closing chunk, and nothing
// otherwise. The pixel data is never decoded; the provider is the decoder.
export function feedbackImageUrl(base64: string): string | undefined {
  if (base64.length % 4 !== 0) return;
  const length = decodedLength(base64);
  if (length < HEADER_BYTES + END_CHUNK.length || length > feedbackImageMaxBytes) return;
  return hasReadableHeader(base64) && hasEndChunk(base64)
    ? `data:image/png;base64,${base64}`
    : undefined;
}

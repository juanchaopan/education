import { feedbackImageMaxBytes } from '@education/contracts';
import { expect, it } from 'vitest';
import { feedbackImageUrl } from './feedback-image.js';

function png(width: number, height: number, extra = 0) {
  const header = Buffer.alloc(24 + extra);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(header);
  header.writeUInt32BE(13, 8);
  header.write('IHDR', 12, 'latin1');
  header.writeUInt32BE(width, 16);
  header.writeUInt32BE(height, 20);
  return header;
}

it('accepts a readable PNG of the exported sheet size, or its half-size export', () => {
  const full = png(1024, 768).toString('base64');
  expect(feedbackImageUrl(full)).toBe(`data:image/png;base64,${full}`);
  expect(feedbackImageUrl(png(512, 384).toString('base64'))).toBeDefined();
});

it.each([
  ['an oversized file', png(1024, 768, feedbackImageMaxBytes).toString('base64')],
  ['a truncated header', png(1024, 768).subarray(0, 20).toString('base64')],
  ['another format', Buffer.from('GIF89a'.padEnd(40, 'x')).toString('base64')],
  ['a wider image', png(1025, 768).toString('base64')],
  ['a taller image', png(1024, 769).toString('base64')],
  ['a tiny image', png(32, 32).toString('base64')],
])('refuses %s', (_name, base64) => {
  expect(feedbackImageUrl(base64)).toBeUndefined();
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { exportInk } from './export-ink';

const drawing = [[{ x: 0.5, y: 0.5 }]];
const maxBytes = 512 * 1024;

function mockEncoder(...sizes: number[]) {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
    this: HTMLCanvasElement,
  ) {
    return {
      canvas: this,
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
    } as unknown as CanvasRenderingContext2D;
  });
  const dimensions: number[][] = [];
  const encoder = vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (
    this: HTMLCanvasElement,
    callback,
  ) {
    dimensions.push([this.width, this.height]);
    const size = sizes.shift();
    callback(size === undefined ? null : new Blob([new Uint8Array(size)], { type: 'image/png' }));
  });
  return { dimensions, encoder };
}

afterEach(() => vi.restoreAllMocks());

describe('drawing export', () => {
  it('tries a smaller image when the full image exceeds the byte limit', async () => {
    const { dimensions } = mockEncoder(maxBytes + 1, maxBytes);
    expect(await exportInk(drawing)).toMatchObject({ size: maxBytes, type: 'image/png' });
    expect(dimensions).toEqual([
      [1024, 768],
      [512, 384],
    ]);
  });

  it('rejects oversize and empty images and never encodes an empty drawing', async () => {
    const { encoder } = mockEncoder(maxBytes + 1);
    expect(await exportInk([])).toBeUndefined();
    expect(encoder).not.toHaveBeenCalled();
    expect(await exportInk(drawing)).toBeUndefined();
  });
});

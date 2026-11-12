import { describe, expect, it } from 'vitest';
import { catalog } from './media-library';

describe('a library catalog', () => {
  const files = { './found.webp': '/assets/found-1a2b.webp' };

  it('gives each entry its id and the address of its picture', () => {
    expect(catalog({ found: { file: 'found.webp' } }, files)).toEqual({
      found: { id: 'found', file: 'found.webp', image: '/assets/found-1a2b.webp' },
    });
  });

  it('takes only pictures beside the list that names them', () => {
    expect(() => catalog({ lost: { file: 'lost.webp' } }, files)).toThrow(
      'lost.webp is not in the library',
    );
  });
});

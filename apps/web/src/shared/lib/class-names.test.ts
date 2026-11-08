import { expect, it } from 'vitest';
import { classNames } from './class-names';

it('keeps only the class names that apply, in order', () => {
  expect(classNames('button', false, 'primary', undefined, null, '', 'placed')).toBe(
    'button primary placed',
  );
});

it('gives an empty class when nothing applies', () => {
  expect(classNames(false, undefined)).toBe('');
});

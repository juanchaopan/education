import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { expect, it } from 'vitest';
import { ProgressTag } from './ProgressTag';

const tag = (element: ReactElement) => render(element).container.firstElementChild;

it('shows how many problems are done of how many, and says it in words', () => {
  const shown = tag(<ProgressTag done={5} total={12} />);
  expect(shown).toHaveTextContent('5/12');
  expect(shown).toHaveTextContent('做完 5 道，共 12 道');
  expect(shown).not.toHaveAttribute('data-finished');
});

it('turns into a finished tag once every problem is done', () => {
  const shown = tag(<ProgressTag done={12} total={12} />);
  expect(shown).toHaveAttribute('data-finished');
  expect(shown).toHaveTextContent('学完');
});

it('is not finished for a book without problems', () => {
  expect(tag(<ProgressTag done={0} total={0} />)).not.toHaveAttribute('data-finished');
});

it("names the child it belongs to, with the child's initial", () => {
  const shown = tag(<ProgressTag done={3} total={10} child={{ name: '乐乐', place: 1 }} />);
  expect(shown).toHaveTextContent('乐乐');
  expect(shown).toHaveTextContent('3/10');
  const finished = tag(<ProgressTag done={10} total={10} child={{ name: '小米', place: 0 }} />);
  expect(finished).toHaveTextContent('小米');
  expect(finished).toHaveTextContent('学完了');
});

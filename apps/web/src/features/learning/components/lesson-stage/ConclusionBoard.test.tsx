import { render, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { ConclusionBoard, type BoardFact } from './ConclusionBoard';

const ball = <circle cx="50%" cy="50%" r="40%" />;

const fact = (id: string, says: string, counts: readonly number[]): BoardFact => ({
  id,
  says,
  amounts: counts.map((count, index) => ({ key: `${id}-${index}`, count, picture: ball })),
  lit: false,
  supposed: false,
});

const board = () => screen.getByRole('list', { name: '记住的结论' });
const drawn = (says: string) =>
  screen.getByText(says).parentElement?.querySelector('[aria-hidden="true"]');

it('reads each conclusion as a sentence, in the order the lesson found them', () => {
  render(
    <ConclusionBoard
      facts={[
        fact('first', '1 个盒子和 2 个黄球一样重', [1, 2]),
        fact('second', '1 个黄球和 3 个红球一样重', [1, 3]),
      ]}
    />,
  );
  const items = within(board()).getAllByRole('listitem');
  expect(items.map((item) => item.textContent)).toEqual([
    expect.stringContaining('1 个盒子和 2 个黄球一样重'),
    expect.stringContaining('1 个黄球和 3 个红球一样重'),
  ]);
});

it('tells a screen reader of each conclusion as it arrives', () => {
  render(<ConclusionBoard facts={[]} />);
  expect(board()).toHaveAttribute('aria-live', 'polite');
});

it('draws the amounts with numbers and pictures, equal signs between them', () => {
  render(<ConclusionBoard facts={[fact('answered', '读出的句子', [1, 2, 6])]} />);
  expect(drawn('读出的句子')?.textContent).toBe('1=2=6');
  expect(drawn('读出的句子')?.querySelectorAll('svg circle')).toHaveLength(3);
});

it('marks the conclusion in use as the current one', () => {
  render(
    <ConclusionBoard
      facts={[fact('idle', '不用的', [1, 2]), { ...fact('used', '用到的', [1, 3]), lit: true }]}
    />,
  );
  expect(screen.getByText('不用的').parentElement).not.toHaveAttribute('aria-current');
  expect(screen.getByText('用到的').parentElement).toHaveAttribute('aria-current', 'true');
});

it('keeps a supposed condition beside the one it changes, tagged 假如 and read as one', () => {
  const says = '假如 1 个黄球和 2 个红球一样重';
  render(
    <ConclusionBoard
      facts={[
        fact('original', '1 个黄球和 3 个红球一样重', [1, 3]),
        { ...fact('supposed', says, [1, 2]), supposed: true },
        fact('later', '1 个盒子和 2 组红球一样重', [1, 2]),
      ]}
    />,
  );
  const [pair, later] = within(board()).getAllByRole('listitem');
  expect(pair).toHaveTextContent('1 个黄球和 3 个红球一样重');
  expect(pair).toHaveTextContent(says);
  expect(later).toHaveTextContent('1 个盒子和 2 组红球一样重');
  expect(drawn(says)?.textContent).toBe('假如1=2');
});

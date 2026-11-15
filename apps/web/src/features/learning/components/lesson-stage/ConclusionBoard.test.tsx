import type { AmountDrawing } from '@education/problems/lesson-content';
import { render, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { boardAmount, type BoardAmount } from './board-layout';
import { ConclusionBoard, type BoardFact } from './ConclusionBoard';

const ball = { art: <circle cx="50%" cy="50%" r="40%" />, shape: 'round' } as const;

const amount = (count: number, drawing: AmountDrawing = {}) =>
  boardAmount(`${count}-${drawing.group ?? 1}-${drawing.times ?? false}`, count, ball, drawing);

const fact = (id: string, says: string, amounts: readonly BoardAmount[]): BoardFact => ({
  id,
  says,
  amounts,
  lit: false,
  supposed: false,
});

const board = () => screen.getByRole('list', { name: '记住的结论' });
const drawn = (says: string) =>
  screen.getByText(says).parentElement?.querySelector('[aria-hidden="true"]');
const balls = (says: string) => drawn(says)?.querySelectorAll('svg circle').length;

it('reads each conclusion as a sentence, in the order the lesson found them', () => {
  render(
    <ConclusionBoard
      facts={[
        fact('first', '1 个盒子和 2 个黄球一样重', [amount(1), amount(2)]),
        fact('second', '1 个黄球和 3 个红球一样重', [amount(1), amount(3)]),
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

it('draws every thing an amount counts, with no numbers, equal signs between them', () => {
  render(
    <ConclusionBoard facts={[fact('answered', '读出的句子', [amount(1), amount(3), amount(6)])]} />,
  );
  expect(drawn('读出的句子')?.textContent).toBe('==');
  expect(balls('读出的句子')).toBe(10);
});

it('draws an amount in frames when it is grouped', () => {
  render(
    <ConclusionBoard
      facts={[fact('groups', '分组的句子', [amount(1), amount(6, { group: 3 })])]}
    />,
  );
  expect(balls('分组的句子')).toBe(7);
  expect(drawn('分组的句子')?.textContent).toBe('=');
});

it('writes 「k×」 before one thing, or one frame, when there are too many to draw', () => {
  render(
    <ConclusionBoard
      facts={[
        fact('many', '很多的句子', [
          amount(1),
          amount(32, { group: 8, times: true }),
          amount(64, { times: true }),
        ]),
      ]}
    />,
  );
  expect(drawn('很多的句子')?.textContent).toBe('=4×=64×');
  expect(balls('很多的句子')).toBe(1 + 8 + 1);
});

it('marks the conclusion in use as the current one', () => {
  render(
    <ConclusionBoard
      facts={[
        fact('idle', '不用的', [amount(1), amount(2)]),
        { ...fact('used', '用到的', [amount(1), amount(3)]), lit: true },
      ]}
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
        fact('original', '1 个黄球和 3 个红球一样重', [amount(1), amount(3)]),
        { ...fact('supposed', says, [amount(1), amount(2)]), supposed: true },
        fact('later', '1 个盒子和 2 组红球一样重', [amount(1), amount(6, { group: 3 })]),
      ]}
    />,
  );
  const [pair, later] = within(board()).getAllByRole('listitem');
  expect(pair).toHaveTextContent('1 个黄球和 3 个红球一样重');
  expect(pair).toHaveTextContent(says);
  expect(later).toHaveTextContent('1 个盒子和 2 组红球一样重');
  expect(drawn(says)?.textContent).toBe('假如=');
});

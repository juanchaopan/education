import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import type { AnswerStep } from '../../interaction/spoken-answer';
import { AnswerCapsule } from './AnswerCapsule';

function capsule(step: AnswerStep, { blocked = false, every = false, label = '' } = {}) {
  const on = {
    onListen: vi.fn(),
    onFinish: vi.fn(),
    onStopWaiting: vi.fn(),
    onConfirm: vi.fn(),
    onChoose: vi.fn(),
    onRetry: vi.fn(),
    onContinue: vi.fn(),
  };
  const view = render(
    <AnswerCapsule
      label={label || undefined}
      question={every ? 'M 和 N 什么时候相距四格？' : '一共有几根黄瓜？'}
      step={step}
      unit={every ? '秒' : '根'}
      every={every}
      choices={every ? [4, 6, 10, 14] : [8, 9]}
      blocked={blocked}
      {...on}
    />,
  );
  return { ...on, ...view };
}

it('shows nothing while the teacher is still asking', () => {
  const { container } = capsule({ kind: 'waiting' });
  expect(container).toBeEmptyDOMElement();
});

it('stops listening when the child says they are done', async () => {
  const on = capsule({ kind: 'listening', message: '我在听' });
  await userEvent.click(screen.getByRole('button', { name: '说完了' }));
  expect(on.onFinish).toHaveBeenCalledOnce();
});

it('shows the count it heard, to agree with or say again, under the question it answers', async () => {
  const on = capsule({ kind: 'confirm', heard: '九根', said: [9] });
  const answer = screen.getByRole('region', { name: '说出答案' });
  expect(answer).toHaveTextContent('一共有几根黄瓜？我听到9根');
  await userEvent.click(screen.getByRole('button', { name: '对，是 9' }));
  await userEvent.click(screen.getByRole('button', { name: '重说' }));
  expect(on.onConfirm).toHaveBeenCalledOnce();
  expect(on.onListen).toHaveBeenCalledOnce();
});

it('shows every number it heard when the answer is every number that fits', async () => {
  const on = capsule({ kind: 'confirm', heard: '六秒和十四秒', said: [6, 14] }, { every: true });
  expect(screen.getByRole('region', { name: '说出答案' })).toHaveTextContent('我听到6秒14秒');
  await userEvent.click(screen.getByRole('button', { name: '对，是 6 和 14' }));
  expect(on.onConfirm).toHaveBeenCalledOnce();
});

it('cannot open the microphone while someone else is speaking', () => {
  capsule({ kind: 'ask', message: '', choices: false }, { blocked: true });
  expect(screen.getByRole('button', { name: '再说一次' })).toBeDisabled();
});

it('offers numbers to tap once speech cannot be used', async () => {
  const on = capsule({ kind: 'ask', message: '', choices: true });
  const numbers = screen.getByRole('group', { name: '点一个数字回答' });
  await userEvent.click(within(numbers).getByRole('button', { name: '9' }));
  expect(on.onChoose).toHaveBeenCalledWith([9]);
});

it('lights several numbers to hand in together when the answer is every number that fits', async () => {
  const on = capsule({ kind: 'ask', message: '', choices: true }, { every: true });
  const numbers = screen.getByRole('group', { name: '点亮每一个答案' });
  const hand = screen.getByRole('button', { name: '交' });
  expect(hand).toBeDisabled();
  await userEvent.click(within(numbers).getByRole('button', { name: '14' }));
  await userEvent.click(within(numbers).getByRole('button', { name: '4' }));
  await userEvent.click(within(numbers).getByRole('button', { name: '6' }));
  await userEvent.click(within(numbers).getByRole('button', { name: '4' }));
  expect(within(numbers).getByRole('button', { name: '6' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(within(numbers).getByRole('button', { name: '4' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await userEvent.click(screen.getByRole('button', { name: '交：6 和 14' }));
  expect(on.onChoose).toHaveBeenCalledExactlyOnceWith([6, 14]);
});

it('sends a lost answer again', async () => {
  const on = capsule({ kind: 'failed', message: '暂时连不上，请重试。' });
  await userEvent.click(screen.getByRole('button', { name: '再交一次' }));
  expect(on.onRetry).toHaveBeenCalledOnce();
});

it('carries the film on after a correct answer', async () => {
  const on = capsule({ kind: 'done', assisted: false });
  await userEvent.click(screen.getByRole('button', { name: '接着看' }));
  expect(on.onContinue).toHaveBeenCalledOnce();
});

it('shows a guess recorded as it was heard, with nothing to tap and no word of right or wrong', () => {
  capsule({ kind: 'recorded', said: [6] }, { label: '说出你猜的数' });
  expect(screen.getByRole('region', { name: '说出你猜的数' })).toHaveTextContent('记下了6根');
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});

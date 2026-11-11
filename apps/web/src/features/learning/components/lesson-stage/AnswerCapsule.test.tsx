import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import type { AnswerStep } from '../../interaction/spoken-answer';
import { AnswerCapsule } from './AnswerCapsule';

function capsule(step: AnswerStep, blocked = false) {
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
    <AnswerCapsule step={step} unit="根" choices={[8, 9]} blocked={blocked} {...on} />,
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

it('shows the count it heard, to agree with or say again', async () => {
  const on = capsule({ kind: 'confirm', heard: '九根', count: 9 });
  const answer = screen.getByRole('region', { name: '说出答案' });
  expect(answer).toHaveTextContent('我听到9根');
  await userEvent.click(screen.getByRole('button', { name: '对，是 9' }));
  await userEvent.click(screen.getByRole('button', { name: '重说' }));
  expect(on.onConfirm).toHaveBeenCalledOnce();
  expect(on.onListen).toHaveBeenCalledOnce();
});

it('cannot open the microphone while someone else is speaking', () => {
  capsule({ kind: 'ask', message: '', choices: false }, true);
  expect(screen.getByRole('button', { name: '再说一次' })).toBeDisabled();
});

it('offers numbers to tap once speech cannot be used', async () => {
  const on = capsule({ kind: 'ask', message: '', choices: true });
  const numbers = screen.getByRole('group', { name: '点一个数字回答' });
  await userEvent.click(within(numbers).getByRole('button', { name: '9' }));
  expect(on.onChoose).toHaveBeenCalledWith(9);
});

it('sends a lost answer again', async () => {
  const on = capsule({ kind: 'failed', message: '暂时连不上，请重试。' });
  await userEvent.click(screen.getByRole('button', { name: '再交一次' }));
  expect(on.onRetry).toHaveBeenCalledOnce();
});

it('carries the film on after a correct count', async () => {
  const on = capsule({ kind: 'done', assisted: false });
  await userEvent.click(screen.getByRole('button', { name: '接着看' }));
  expect(on.onContinue).toHaveBeenCalledOnce();
});

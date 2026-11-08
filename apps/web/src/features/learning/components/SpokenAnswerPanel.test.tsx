import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { expect, it, vi } from 'vitest';
import { SpokenAnswerPanel } from './SpokenAnswerPanel';

type Props = ComponentProps<typeof SpokenAnswerPanel>;

function show(step: Props['step'], extra: Partial<Props> = {}) {
  const on = {
    onSpeak: vi.fn(),
    onStop: vi.fn(),
    onCancel: vi.fn(),
    onStopWaiting: vi.fn(),
    onConfirm: vi.fn(),
    onChoose: vi.fn(),
    onRetry: vi.fn(),
    onHint: vi.fn(),
    onContinue: vi.fn(),
  };
  render(
    <SpokenAnswerPanel
      question="一棵青菜和几根黄瓜一样重？"
      step={step}
      choices={[3, 6, 9]}
      canHint={false}
      {...on}
      {...extra}
    />,
  );
  return on;
}

it('asks the child to confirm the number that was heard before it counts', async () => {
  const on = show({ kind: 'confirm', heard: '九根', count: 9 });
  expect(screen.getByRole('status')).toHaveTextContent('我听到你说「九根」，是 9 吗？');
  await userEvent.click(screen.getByRole('button', { name: '对，是 9' }));
  expect(on.onConfirm).toHaveBeenCalledOnce();
  await userEvent.click(screen.getByRole('button', { name: '不对，再说一次' }));
  expect(on.onSpeak).toHaveBeenCalledOnce();
});

it('shows numbers to tap only when the step offers them', async () => {
  show({ kind: 'ask', message: '', choices: false });
  expect(screen.queryByRole('group', { name: '点一个数字回答' })).toBeNull();
  const on = show({
    kind: 'ask',
    message: '没有拿到麦克风权限。可以点下面的数字回答。',
    choices: true,
  });
  await userEvent.click(screen.getByRole('button', { name: '9' }));
  expect(on.onChoose).toHaveBeenCalledExactlyOnceWith(9);
});

it('offers a hint while the child is answering and shows it', async () => {
  const on = show(
    { kind: 'ask', message: '不是 3', choices: false },
    { canHint: true, hint: '先看第一架秤。' },
  );
  await userEvent.click(screen.getByRole('button', { name: '给我一个提示' }));
  expect(on.onHint).toHaveBeenCalledOnce();
  expect(screen.getByText('先看第一架秤。')).toBeInTheDocument();
});

it('lets a lost submission be sent again and a correct one move on', async () => {
  const failed = show({ kind: 'failed', message: '暂时连不上，请重试。' });
  await userEvent.click(screen.getByRole('button', { name: '再交一次' }));
  expect(failed.onRetry).toHaveBeenCalledOnce();
  const done = show({ kind: 'done', assisted: false });
  expect(screen.getByText('答对了！你自己算出来了。')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: '接着看' }));
  expect(done.onContinue).toHaveBeenCalledOnce();
});

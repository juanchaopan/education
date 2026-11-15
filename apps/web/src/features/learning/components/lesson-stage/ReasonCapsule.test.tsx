import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import type { ReasonStep } from '../../interaction/variation-steps';
import { ReasonCapsule } from './ReasonCapsule';

const choices = { groups: '组数', 'per-group': '每组根数' };

function capsule(step: ReasonStep) {
  const on = {
    onListen: vi.fn(),
    onFinish: vi.fn(),
    onStopWaiting: vi.fn(),
    onConfirm: vi.fn(),
    onChoose: vi.fn(),
    onRetry: vi.fn(),
  };
  const view = render(
    <ReasonCapsule
      question="和你猜的一样吗？说说为什么。"
      step={step}
      choices={choices}
      blocked={false}
      {...on}
    />,
  );
  return { ...on, ...view };
}

it('shows the sentence heard, to agree with or say again', async () => {
  const on = capsule({ kind: 'confirm', heard: '还是三组，每组两根' });
  expect(screen.getByRole('region', { name: '说说为什么' })).toHaveTextContent(
    '我听到你说『还是三组，每组两根』',
  );
  await userEvent.click(screen.getByRole('button', { name: '对' }));
  await userEvent.click(screen.getByRole('button', { name: '重说' }));
  expect(on.onConfirm).toHaveBeenCalledOnce();
  expect(on.onListen).toHaveBeenCalledOnce();
});

it('asks to say a reason that was not clear again', async () => {
  const on = capsule({ kind: 'ask', message: '还没说清楚。', choices: false });
  await userEvent.click(screen.getByRole('button', { name: '再说一次' }));
  expect(on.onListen).toHaveBeenCalledOnce();
});

it('hands in what is lit in the two rows, together, once something is lit', async () => {
  const on = capsule({ kind: 'ask', message: '', choices: true });
  const send = screen.getByRole('button', { name: '交' });
  expect(send).toBeDisabled();
  const kept = screen.getByRole('group', { name: '没变的是' });
  const changed = screen.getByRole('group', { name: '变了的是' });
  await userEvent.click(within(kept).getByRole('button', { name: '组数' }));
  await userEvent.click(within(changed).getByRole('button', { name: '每组根数' }));
  await userEvent.click(within(changed).getByRole('button', { name: '组数' }));
  await userEvent.click(within(changed).getByRole('button', { name: '组数' }));
  expect(within(kept).getByRole('button', { name: '组数' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(within(changed).getByRole('button', { name: '组数' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await userEvent.click(send);
  expect(on.onChoose).toHaveBeenCalledExactlyOnceWith({ kept: ['groups'], changed: ['per-group'] });
});

it('shows nothing before listening and once the reason is clear', () => {
  expect(capsule({ kind: 'waiting' }).container).toBeEmptyDOMElement();
});

it('is gone once the reason is clear, as the lesson moves on', () => {
  expect(capsule({ kind: 'explained' }).container).toBeEmptyDOMElement();
});

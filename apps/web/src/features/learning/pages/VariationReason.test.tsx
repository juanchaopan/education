import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import type { ReasonJudgement } from '../data-access/useLessonVariation';
import { createSubtitle } from '../interaction/subtitle';
import { createMicrophoneTurn } from '../voice/microphone-turn';
import { SpokenReason } from './VariationReason';

const unclear = '还没说清楚。再说一次。';
const film = { telling: false, speaking: true, chime: { play: () => {}, audio: () => undefined } };

function reasoning() {
  const subtitle = createSubtitle();
  const submit = vi.fn();
  const view = (judgement: ReasonJudgement) => (
    <SpokenReason
      scope={{ id: 'garden-balance', version: 1, csrf: 'token' }}
      stepId="why"
      reason={{ judgement, submit, retry: () => {} }}
      explained={false}
      onExplained={() => {}}
      settings={{ question: '和你猜的一样吗？说说为什么。', unclear }}
      choices={{ groups: '组数', 'per-group': '每组根数' }}
      subtitle={subtitle}
      film={film}
      turn={createMicrophoneTurn()}
    />
  );
  return { view, submit, said: () => subtitle.newest()?.text };
}

it('keeps the words to tap once the child taps, saying the lesson words after a reason that is not clear', async () => {
  const { view, submit, said } = reasoning();
  const { rerender } = render(view({ status: 'open' }));
  expect(screen.queryByRole('group', { name: '变了的是' })).not.toBeInTheDocument();

  const uncertain = { status: 'judged', outcome: 'uncertain' } as const;
  rerender(view(uncertain));
  expect(screen.queryByRole('group', { name: '变了的是' })).not.toBeInTheDocument();
  rerender(view({ status: 'judging' }));
  rerender(view(uncertain));
  const changed = screen.getByRole('group', { name: '变了的是' });
  expect(said()).toBe('我还没听清你的理由。点一点下面的词，选出没变的和变了的。');

  await userEvent.click(changed.querySelector('button')!);
  await userEvent.click(screen.getByRole('button', { name: '交' }));
  expect(submit).toHaveBeenCalledOnce();
  rerender(view({ status: 'judging' }));
  rerender(view({ status: 'judged', outcome: 'incorrect' }));

  expect(screen.getByRole('group', { name: '变了的是' })).toBeInTheDocument();
  expect(screen.getByRole('group', { name: '没变的是' })).toBeInTheDocument();
  expect(said()).toBe(unclear);
});

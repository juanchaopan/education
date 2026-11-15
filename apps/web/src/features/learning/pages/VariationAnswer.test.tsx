import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { queryWrapper } from '../../../test/query-wrapper';
import { createSubtitle } from '../interaction/subtitle';
import type { VariationPlay } from '../lessons/lesson-definition';
import { createMicrophoneTurn } from '../voice/microphone-turn';
import { VariationAnswer } from './VariationAnswer';

type Shot = 'answer' | 'guess' | 'swap' | 'why' | 'reveal';

const play: VariationPlay<Shot> = {
  scenes: {
    guessScene: 'guess',
    reasonScene: 'why',
    revealScene: 'reveal',
    result: 'six',
    keeps: [],
    choices: { groups: '组数', 'per-group': '每组根数' },
  },
  answering: ['guess', 'swap', 'why'],
  afterGuess: 'swap',
  answer: {
    guess: { question: '一棵青菜和几根黄瓜一样重？', unit: '根', choices: [4, 5, 6] },
    reason: { question: '和你猜的一样吗？说说为什么。', unclear: '还没说清楚。再说一次。' },
    hints: ['groups-and-count'],
  },
};

const scope = { id: 'garden-balance', version: 1, csrf: 'token' };
const film = { telling: false, speaking: false, chime: { play: () => {}, audio: () => undefined } };

// What the preview endpoint replies, in order, each a moment later, as a
// server does, and what it was sent.
let replies: unknown[] = [];
const sent = () =>
  vi.mocked(fetch).mock.calls.map(([, init]) => JSON.parse(String(init?.body)) as unknown);

beforeEach(() => {
  replies = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      const reply = replies.shift();
      await new Promise((settled) => setTimeout(settled, 20));
      return Response.json(reply);
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

function preview(shot: Shot) {
  const go = vi.fn();
  const subtitle = createSubtitle();
  const Wrapper = queryWrapper();
  render(
    <Wrapper>
      <VariationAnswer
        mode="preview"
        play={play}
        shot={shot}
        scope={scope}
        film={film}
        turn={createMicrophoneTurn()}
        subtitle={subtitle}
        go={go}
      />
    </Wrapper>,
  );
  return { go, said: () => subtitle.newest()?.text };
}

it('records a tapped guess, right or wrong, and moves on after showing it a moment', async () => {
  replies = [{ outcome: 'incorrect' }];
  const { go } = preview('guess');
  const guess = screen.getByRole('region', { name: '说出你猜的数' });
  await userEvent.click(within(guess).getByRole('button', { name: '5' }));
  await waitFor(() => expect(guess).toHaveTextContent('记下了5根'));
  expect(sent()).toEqual([{ action: 'variation', guess: 5 }]);
  expect(go).not.toHaveBeenCalled();
  await waitFor(() => expect(go).toHaveBeenCalledExactlyOnceWith('swap'), { timeout: 3000 });
});

it("says the lesson's words for a reason that is not clear, then moves on once it is", async () => {
  replies = [{ outcome: 'incorrect' }, { outcome: 'independent' }];
  const { go, said } = preview('why');
  const rows = () => ({
    kept: screen.getByRole('group', { name: '没变的是' }),
    changed: screen.getByRole('group', { name: '变了的是' }),
  });
  await userEvent.click(within(rows().changed).getByRole('button', { name: '组数' }));
  await userEvent.click(screen.getByRole('button', { name: '交' }));
  await waitFor(() => expect(said()).toBe('还没说清楚。再说一次。'));
  expect(go).not.toHaveBeenCalled();

  // The words come back unlit, to tap afresh.
  const { kept, changed } = rows();
  expect(within(changed).getByRole('button', { name: '组数' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await userEvent.click(within(kept).getByRole('button', { name: '组数' }));
  await userEvent.click(within(changed).getByRole('button', { name: '每组根数' }));
  await userEvent.click(screen.getByRole('button', { name: '交' }));
  await waitFor(() => expect(go).toHaveBeenCalledExactlyOnceWith('reveal'));
  expect(sent()).toEqual([
    { action: 'variation', reason: { choose: { kept: [], changed: ['groups'] } } },
    { action: 'variation', reason: { choose: { kept: ['groups'], changed: ['per-group'] } } },
  ]);
});

it("keeps the variation's own hint at hand in the scenes between, said by the teacher", async () => {
  replies = [{ hint: '数一数，现在有几组？' }];
  const { said } = preview('swap');
  expect(screen.queryByRole('region', { name: '说出你猜的数' })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: '给我一个提示，还有 1 个' }));
  await waitFor(() => expect(said()).toBe('数一数，现在有几组？'));
  expect(sent()).toEqual([{ action: 'variation', hintId: 'groups-and-count' }]);
});

it('shows nothing outside the scenes the variation is answered in', () => {
  preview('answer');
  expect(screen.queryByRole('button', { name: /提示/ })).not.toBeInTheDocument();
  preview('reveal');
  expect(screen.queryByRole('button', { name: /提示/ })).not.toBeInTheDocument();
});

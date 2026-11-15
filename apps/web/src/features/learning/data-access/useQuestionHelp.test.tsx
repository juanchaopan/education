import { act, renderHook } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { queryWrapper } from '../../../test/query-wrapper';
import { useQuestionHelp, type QuestionHelp } from './useQuestionHelp';

const scope = { id: 'garden-balance', version: 1, csrf: 'token' };
// The final answer and the variation after it are answered under one round.
const round = '11111111-1111-1111-1111-111111111111';

const helpOn = (name: string) => ({
  round: { name, read: () => Promise.resolve({ round }) },
  record: vi.fn(() => Promise.resolve({ helped: true })),
});

function setup(first: QuestionHelp) {
  return renderHook(({ help }) => useQuestionHelp(scope, help), {
    initialProps: { help: first },
    wrapper: queryWrapper(),
  });
}

// Asks for a question to count, then lets the query library tell the page
// what came of it, which it does on a later task.
async function ask(result: ReturnType<typeof setup>['result']) {
  await act(async () => void (await result.current.counted()));
  await act(() => new Promise((settled) => setTimeout(settled, 0)));
}

it('records help once a round on each part, though the answer and the variation share it', async () => {
  const answer = helpOn('answer-round');
  const variation = helpOn('variation-round');
  const { result, rerender } = setup(answer);
  await ask(result);
  await ask(result);
  rerender({ help: variation });
  await ask(result);
  expect(answer.record).toHaveBeenCalledExactlyOnceWith(scope, round);
  expect(variation.record).toHaveBeenCalledExactlyOnceWith(scope, round);
});

it('lets a question go out at once when it counts as help on nothing', async () => {
  const { result } = renderHook(() => useQuestionHelp(scope), { wrapper: queryWrapper() });
  await expect(result.current.counted()).resolves.toBe(true);
});

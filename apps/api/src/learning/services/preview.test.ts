import { describe, expect, it } from 'vitest';
import type { AnsweringPolicy } from '@education/problems/server';
import { createPreviewService } from './preview.js';

const problem = { id: 'shape-a', version: 1 };
const credentials = { token: 'token', csrf: 'csrf' };
const policy: AnsweringPolicy = {
  hints: { count: '先数左边。' },
  checkCompletion: (input) => (input === 9 ? 'correct' : input === 8 ? 'incorrect' : 'uncertain'),
};

// The preview of a problem whose answering policy is `found`.
const previewOf = (found: AnsweringPolicy | undefined) =>
  createPreviewService(async (_credentials, _problem, work) => work(found));

describe('preview service', () => {
  it('judges an answer by the problem’s rules, a right one as independent', async () => {
    const answer = (input: number) =>
      previewOf(policy)(credentials, problem, { action: 'submit', input });
    expect(await answer(9)).toEqual({ outcome: 'independent' });
    expect(await answer(8)).toEqual({ outcome: 'incorrect' });
    expect(await answer(7)).toEqual({ outcome: 'uncertain' });
  });

  it('gives the authored hints and refuses one the problem does not have', async () => {
    const hint = (hintId: string) =>
      previewOf(policy)(credentials, problem, { action: 'hint', hintId });
    expect(await hint('count')).toEqual({ hint: '先数左边。' });
    await expect(hint('missing')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('refuses a problem with no answer', async () => {
    await expect(
      previewOf(undefined)(credentials, problem, { action: 'submit', input: 9 }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

import { describe, expect, it } from 'vitest';
import type { PreviewCommand } from '@education/contracts';
import type { AnsweringPolicy, VariationPolicy } from '@education/problems/server';
import { createPreviewService } from './preview.js';

const problem = { id: 'shape-a', version: 1 };
const credentials = { token: 'token', csrf: 'csrf' };
const answering: AnsweringPolicy = {
  hints: { count: '先数左边。' },
  checkCompletion: (input) => (input === 9 ? 'correct' : input === 8 ? 'incorrect' : 'uncertain'),
};
const variation: VariationPolicy = {
  hints: { 'count-again': '数一数，现在有几组？' },
  checkGuess: (input) => (input === 6 ? 'correct' : input === 5 ? 'incorrect' : 'uncertain'),
  checkReason: (reason) => {
    if (!('choose' in reason)) return 'uncertain';
    return reason.choose.kept.includes('groups') ? 'correct' : 'incorrect';
  },
};

// The preview of a problem with the rules `policies`.
const previewOf =
  (policies: { answering?: AnsweringPolicy; variation?: VariationPolicy }) =>
  (command: PreviewCommand) =>
    createPreviewService(async (_credentials, _problem, work) => work(policies))(
      credentials,
      problem,
      command,
    );
const preview = previewOf({ answering, variation });

describe('preview service', () => {
  it('judges an answer by the problem’s rules, a right one as independent', async () => {
    const answer = (input: number) => preview({ action: 'submit', input });
    expect(await answer(9)).toEqual({ outcome: 'independent' });
    expect(await answer(8)).toEqual({ outcome: 'incorrect' });
    expect(await answer(7)).toEqual({ outcome: 'uncertain' });
  });

  it('gives the authored hints and refuses one the problem does not have', async () => {
    const hint = (hintId: string) => preview({ action: 'hint', hintId });
    expect(await hint('count')).toEqual({ hint: '先数左边。' });
    await expect(hint('count-again')).rejects.toMatchObject({ statusCode: 404 });
    await expect(hint('missing')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('judges the variation’s guess and reasons by its rules, a clear reason as independent', async () => {
    const guess = (input: number) => preview({ action: 'variation', guess: input });
    expect(await guess(6)).toEqual({ outcome: 'independent' });
    expect(await guess(5)).toEqual({ outcome: 'incorrect' });
    expect(await guess(4)).toEqual({ outcome: 'uncertain' });
    const reason = (kept: string[]) =>
      preview({ action: 'variation', reason: { choose: { kept, changed: [] } } });
    expect(await reason(['groups'])).toEqual({ outcome: 'independent' });
    expect(await reason(['apples'])).toEqual({ outcome: 'incorrect' });
    expect(await preview({ action: 'variation', reason: { say: '嗯' } })).toEqual({
      outcome: 'uncertain',
    });
  });

  it('gives only the variation’s own hints for the variation', async () => {
    const hint = (hintId: string) => preview({ action: 'variation', hintId });
    expect(await hint('count-again')).toEqual({ hint: '数一数，现在有几组？' });
    await expect(hint('count')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('refuses a problem with no answer, and a variation the problem does not have', async () => {
    await expect(previewOf({ variation })({ action: 'submit', input: 9 })).rejects.toMatchObject({
      statusCode: 404,
    });
    await expect(previewOf({ answering })({ action: 'variation', guess: 6 })).rejects.toMatchObject(
      { statusCode: 404 },
    );
  });
});

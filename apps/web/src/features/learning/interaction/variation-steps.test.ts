import { describe, expect, it } from 'vitest';
import type { Judgement } from '../data-access/useLessonAnswer';
import type { ReasonJudgement } from '../data-access/useLessonVariation';
import type { VoiceState } from '../data-access/voice-input';
import {
  guessStep,
  missesAfter,
  reasonStep,
  reasonTry,
  reasonWords,
  tappedGuessStep,
  tappedReasonStep,
} from './variation-steps';

const idle: VoiceState = { status: 'idle' };
const open: Judgement = { status: 'open' };
const guessed = (outcome: 'independent' | 'incorrect' | 'uncertain', said = 6): Judgement => ({
  status: 'judged',
  outcome,
  said: [said],
});
const listened = { unit: '根', awaiting: false };

describe('the guess', () => {
  it('asks to confirm the number heard, in its unit', () => {
    const review: VoiceState = { status: 'review', text: '六根' };
    expect(guessStep(review, open, listened)).toEqual({
      kind: 'confirm',
      heard: '六根',
      said: [6],
    });
  });

  it('records the guess whether it is right or wrong, never saying which', () => {
    expect(guessStep(idle, guessed('independent'), listened)).toEqual({
      kind: 'recorded',
      said: [6],
    });
    expect(guessStep(idle, guessed('incorrect', 8), listened)).toEqual({
      kind: 'recorded',
      said: [8],
    });
  });

  it('asks again for a guess that could not be judged, and records nothing', () => {
    expect(guessStep(idle, guessed('uncertain'), listened)).toEqual({
      kind: 'ask',
      message: '我没听出你猜的是几，再说一次吧。',
      choices: false,
    });
  });

  it('waits for the microphone to open by itself before anything is said', () => {
    expect(guessStep(idle, open, { ...listened, awaiting: true })).toEqual({ kind: 'waiting' });
  });

  it('offers numbers to tap from the start when tapped, as in a preview', () => {
    expect(tappedGuessStep(open)).toEqual({ kind: 'ask', message: '', choices: true });
    expect(tappedGuessStep(guessed('incorrect'))).toEqual({ kind: 'recorded', said: [6] });
  });
});

const notYet: ReasonJudgement = { status: 'open' };
const judged = (outcome: 'assisted' | 'incorrect' | 'uncertain'): ReasonJudgement => ({
  status: 'judged',
  outcome,
});
const unclear = '还没说清楚。再说一次。';
const reasoning = { unclear, awaiting: false, tapping: false };

describe('the reason', () => {
  it('asks to confirm the sentence heard', () => {
    const review: VoiceState = { status: 'review', text: '还是三组，每组两根' };
    const step = reasonStep(review, notYet, reasoning);
    expect(step).toEqual({ kind: 'confirm', heard: '还是三组，每组两根' });
    expect(reasonWords(step)).toBe('我听到你说「还是三组，每组两根」，对吗？');
  });

  it('asks again when nothing was heard in the words', () => {
    const review: VoiceState = { status: 'review', text: '  ' };
    expect(reasonStep(review, notYet, reasoning)).toMatchObject({ kind: 'ask', choices: false });
  });

  it("says the lesson's own words for a reason that is not clear, and asks for it again", () => {
    expect(reasonStep(idle, judged('incorrect'), reasoning)).toEqual({
      kind: 'ask',
      message: unclear,
      choices: false,
    });
  });

  it('asks again for a reason that could not be judged', () => {
    expect(reasonStep(idle, judged('uncertain'), reasoning)).toEqual({
      kind: 'ask',
      message: '我没听清你的理由，再说一次吧。',
      choices: false,
    });
  });

  it('is done once the reason is clear, even after help', () => {
    expect(reasonStep(idle, judged('assisted'), reasoning)).toEqual({ kind: 'explained' });
  });

  it('turns to the words to tap once tapping, keeping what the teacher said', () => {
    expect(reasonStep(idle, judged('incorrect'), { ...reasoning, tapping: true })).toEqual({
      kind: 'ask',
      message: unclear,
      choices: true,
    });
    expect(tappedReasonStep(notYet, unclear)).toEqual({ kind: 'ask', message: '', choices: true });
  });

  it('turns to the words to tap at once when speech cannot be used at all', () => {
    const denied: VoiceState = { status: 'unavailable', reason: 'denied' };
    expect(reasonStep(denied, notYet, reasoning)).toMatchObject({ kind: 'ask', choices: true });
  });
});

describe('the tries at saying the reason', () => {
  it('counts tries that came to nothing in a row, and starts over once one is judged', () => {
    const unheard: VoiceState = { status: 'unheard' };
    expect(reasonTry(unheard, notYet)).toBe('missed');
    expect(reasonTry(idle, judged('uncertain'))).toBe('missed');
    expect(reasonTry(idle, judged('incorrect'))).toBe('judged');
    expect(reasonTry({ status: 'recording' }, judged('uncertain'))).toBe('trying');
    expect(missesAfter(missesAfter(0, 'missed'), 'missed')).toBe(2);
    expect(missesAfter(1, 'judged')).toBe(0);
    expect(missesAfter(1, 'trying')).toBe(1);
  });

  it('does not count a refused microphone as a try, since speech cannot be used', () => {
    expect(reasonTry({ status: 'unavailable', reason: 'denied' }, notYet)).toBe('trying');
  });
});

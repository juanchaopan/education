import type { Judgement } from '../data-access/useLessonAnswer';
import type { VoiceState } from '../data-access/voice-input';
import { spokenNumber } from './spoken-number';
import { retryable, voiceMessage, type Alternative } from './voice-message';

// What the answer panel shows next. The microphone opens by itself once the
// question has been told; the child says the answer and confirms the number
// that was heard. Tapping a number is offered only when speech cannot be used
// at all.
export type AnswerStep =
  | { kind: 'waiting' }
  | { kind: 'ask'; message: string; choices: boolean }
  | { kind: 'listening' | 'hearing'; message: string }
  | { kind: 'confirm'; heard: string; count: number }
  | { kind: 'judging' }
  | { kind: 'failed'; message: string }
  | { kind: 'done'; assisted: boolean };

// The lesson's own words for its count: the unit it is counted in, such as 根,
// and what a wrong count most likely is.
export type CountWords = { unit?: string; explain: (count: number) => string };

// A failed try is tried again by speaking; the numbers are the way round
// speech that cannot be used.
const tapping: Alternative = { instead: '可以点下面的数字回答。' };

// The answer is listened for, never held for, so its progress has its own words.
const opening = '正在打开麦克风…';
const listening = '我在听，说出你的答案吧。说完停一下就好。';
const cutShort = '这次没录上，可以再说一次。';

function ask(message: string, choices = false): AnswerStep {
  return { kind: 'ask', message, choices };
}

function review(text: string, unit?: string): AnswerStep {
  const count = spokenNumber(text, unit);
  if (count === undefined)
    return ask(`我听到的是「${text}」，没听出是几。再说一次，只说数字就好。`);
  return { kind: 'confirm', heard: text, count };
}

function failed(state: Extract<VoiceState, { status: 'unavailable' | 'fallback' }>) {
  if (state.reason === 'short') return ask(cutShort);
  return ask(voiceMessage(state, tapping), !retryable(state));
}

// The child speaking, or what the last try came to.
function speaking(state: VoiceState, unit?: string): AnswerStep | undefined {
  switch (state.status) {
    case 'idle':
      return undefined;
    case 'starting':
      return { kind: 'listening', message: opening };
    case 'recording':
      return { kind: 'listening', message: listening };
    case 'transcribing':
      return { kind: 'hearing', message: voiceMessage(state, tapping) };
    case 'review':
      return review(state.text, unit);
    case 'unavailable':
    case 'fallback':
      return failed(state);
    default:
      return ask(voiceMessage(state, tapping), state.status === 'guidance');
  }
}

// A judgement the child cannot answer over: being judged, waiting for a retry,
// or a correct count.
function settled(judgement: Judgement): AnswerStep | undefined {
  if (judgement.status === 'judging') return { kind: 'judging' };
  if (judgement.status === 'failed') return { kind: 'failed', message: judgement.message };
  if (judgement.status !== 'judged') return;
  const { outcome } = judgement;
  if (outcome === 'independent' || outcome === 'assisted')
    return { kind: 'done', assisted: outcome === 'assisted' };
}

function verdict(judgement: Judgement, explain: (count: number) => string) {
  if (judgement.status !== 'judged') return undefined;
  if (judgement.outcome === 'incorrect') return explain(judgement.count);
  return '我还不能确定你的答案，再说一次吧。';
}

// A wrong or unclear count is explained until the child speaks again. Once
// speech has proved unusable the numbers stay beside the explanation, so a
// child without a working microphone can keep answering. `awaiting` tells
// that the microphone is about to open by itself.
export function answerStep(
  voice: VoiceState,
  judgement: Judgement,
  { unit, explain }: CountWords,
  awaiting = false,
): AnswerStep {
  const done = settled(judgement);
  if (done) return done;
  const step = speaking(voice, unit);
  const said = verdict(judgement, explain);
  if (step?.kind === 'ask' && step.choices && said) return { ...step, message: said };
  if (step) return step;
  return awaiting ? { kind: 'waiting' } : ask(said ?? '');
}

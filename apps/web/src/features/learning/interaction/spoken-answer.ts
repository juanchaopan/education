import type { Judgement } from '../data-access/useLessonAnswer';
import type { VoiceState } from '../data-access/voice-input';
import { spokenNumber } from './spoken-number';
import { retryable, voiceMessage, type Alternative } from './voice-message';

// What the answer panel shows next. A child says the answer and confirms the
// number that was heard; tapping a number is offered only when speech cannot
// be used at all.
export type AnswerStep =
  | { kind: 'ask'; message: string; choices: boolean }
  | { kind: 'listening' | 'hearing'; message: string }
  | { kind: 'confirm'; heard: string; count: number }
  | { kind: 'judging' }
  | { kind: 'failed'; message: string }
  | { kind: 'done'; assisted: boolean };

// A failed try is tried again by speaking; the numbers are the way round
// speech that cannot be used.
const tapping: Alternative = { instead: '可以点下面的数字回答。' };

function ask(message: string, choices = false): AnswerStep {
  return { kind: 'ask', message, choices };
}

function review(text: string): AnswerStep {
  const count = spokenNumber(text);
  if (count === undefined)
    return ask(`我听到的是「${text}」，没听出是几。再说一次，只说数字就好。`);
  return { kind: 'confirm', heard: text, count };
}

// The child speaking, or what the last try came to.
function speaking(state: VoiceState): AnswerStep | undefined {
  const message = voiceMessage(state, tapping);
  switch (state.status) {
    case 'idle':
      return undefined;
    case 'starting':
    case 'recording':
      return { kind: 'listening', message };
    case 'transcribing':
      return { kind: 'hearing', message };
    case 'review':
      return review(state.text);
    case 'unavailable':
    case 'fallback':
      return ask(message, !retryable(state));
    default:
      return ask(message, state.status === 'guidance');
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
// child without a working microphone can keep answering.
export function answerStep(
  voice: VoiceState,
  judgement: Judgement,
  explain: (count: number) => string,
): AnswerStep {
  const done = settled(judgement);
  if (done) return done;
  const step = speaking(voice);
  const said = verdict(judgement, explain);
  if (step?.kind === 'ask' && step.choices && said) return { ...step, message: said };
  return step ?? ask(said ?? '');
}

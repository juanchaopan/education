import type { Judgement } from '../data-access/useLessonAnswer';
import type { ReasonJudgement } from '../data-access/useLessonVariation';
import type { VoiceState } from '../data-access/voice-input';
import { ask, unsettledStep, voiceStep, type AnswerStep, type VoiceStep } from './spoken-answer';
import { retryable } from './voice-message';

// The variation's two answers. The guess is a number, said and confirmed as
// the final answer is, and recorded whatever it is: the capsule shows it
// recorded, never right or wrong. The reason is a sentence, said and
// confirmed, judged clear or not clear; when speech cannot be used, or two
// tries in a row were not heard or could not be judged, the child taps what
// stayed and what changed instead.

// A guess the child cannot answer over: being judged, waiting for a retry,
// or recorded, whether it was right or wrong.
function guessSettled(judgement: Judgement): AnswerStep | undefined {
  if (judgement.status === 'judging') return { kind: 'judging' };
  if (judgement.status === 'failed') return { kind: 'failed', message: judgement.message };
  if (judgement.status === 'judged' && judgement.outcome !== 'uncertain')
    return { kind: 'recorded', said: judgement.said };
}

const unclearGuess = '我没听出你猜的是几，再说一次吧。';
const guessVerdict = (judgement: Judgement) =>
  judgement.status === 'judged' ? unclearGuess : undefined;

// What the guess shows next, from the microphone and the server's judgement.
export function guessStep(
  voice: VoiceState,
  judgement: Judgement,
  { unit, awaiting }: Readonly<{ unit?: string; awaiting: boolean }>,
): AnswerStep {
  return (
    guessSettled(judgement) ??
    unsettledStep(voice, guessVerdict(judgement), { unit, every: false, awaiting })
  );
}

// The guess tapped, as in a parent's preview: the numbers from the start.
export function tappedGuessStep(judgement: Judgement): AnswerStep {
  return guessSettled(judgement) ?? ask(guessVerdict(judgement) ?? '', true);
}

// What the reason shows next: like an answer, with the sentence heard to
// confirm, and nothing more once it is clear, as the lesson moves on.
export type ReasonStep =
  | VoiceStep
  | { kind: 'waiting' | 'judging' | 'explained' }
  | { kind: 'confirm'; heard: string }
  | { kind: 'failed'; message: string };

const tappingWords = { instead: '可以点下面的词回答。' };
const unheardReason = '我没听清你的理由，再说一次吧。';

function reasonSettled(judgement: ReasonJudgement): ReasonStep | undefined {
  if (judgement.status === 'judging') return { kind: 'judging' };
  if (judgement.status === 'failed') return { kind: 'failed', message: judgement.message };
  if (judgement.status !== 'judged') return;
  if (judgement.outcome === 'independent' || judgement.outcome === 'assisted')
    return { kind: 'explained' };
}

// What the teacher says of the last reason sent: the lesson's own words
// when it was not clear, a request to say it again when it could not be
// judged.
function reasonVerdict(judgement: ReasonJudgement, unclear: string) {
  if (judgement.status !== 'judged') return undefined;
  return judgement.outcome === 'incorrect' ? unclear : unheardReason;
}

const heardReason = (text: string): ReasonStep =>
  text.trim() ? { kind: 'confirm', heard: text } : ask(unheardReason);

// A reason still to say: the child speaking, or what the last try came to,
// with `said`, what the teacher says of the last reason sent, until the
// child speaks again.
function unsaidReason(voice: VoiceState, said: string | undefined, awaiting: boolean) {
  const step = voiceStep(voice, tappingWords, heardReason);
  if (step?.kind === 'ask' && step.choices && said) return { ...step, message: said };
  if (step) return step;
  return awaiting ? ({ kind: 'waiting' } as const) : ask(said ?? '');
}

// How the reason is taken: what the lesson says of a reason that is not
// clear, whether the microphone is about to open by itself, and whether the
// child taps the reason instead of saying it.
export type Reasoning = Readonly<{ unclear: string; awaiting: boolean; tapping: boolean }>;

// What the reason shows next, from the microphone and the server's judgement.
export function reasonStep(
  voice: VoiceState,
  judgement: ReasonJudgement,
  { unclear, awaiting, tapping }: Reasoning,
): ReasonStep {
  const said = reasonVerdict(judgement, unclear);
  const settled = reasonSettled(judgement);
  if (settled) return settled;
  return tapping ? ask(said ?? '', true) : unsaidReason(voice, said, awaiting);
}

// The reason tapped, as in a parent's preview: the words from the start.
export function tappedReasonStep(judgement: ReasonJudgement, unclear: string): ReasonStep {
  return reasonSettled(judgement) ?? ask(reasonVerdict(judgement, unclear) ?? '', true);
}

// What a try at saying the reason came to: still under way, nothing heard
// or nothing that could be judged, or judged.
export type ReasonTry = 'trying' | 'missed' | 'judged';

export function reasonTry(voice: VoiceState, judgement: ReasonJudgement): ReasonTry {
  if (voice.status === 'unheard') return 'missed';
  if (voice.status === 'unavailable' || voice.status === 'fallback')
    return retryable(voice) ? 'missed' : 'trying';
  if (voice.status !== 'idle' || judgement.status !== 'judged') return 'trying';
  return judgement.outcome === 'uncertain' ? 'missed' : 'judged';
}

// How many tries in a row came to nothing, once a try ends: one more when it
// was missed, none once one was judged.
export function missesAfter(misses: number, ended: ReasonTry) {
  if (ended === 'missed') return misses + 1;
  return ended === 'judged' ? 0 : misses;
}

// Two tries in a row that came to nothing turn the reason to tapping.
export const missesBeforeTapping = 2;

// What the teacher says about a step of the reason, in its subtitle: the
// sentence it heard, to be confirmed, and what went wrong or what to do
// next.
export function reasonWords(step: ReasonStep): string | undefined {
  switch (step.kind) {
    case 'confirm':
      return `我听到你说「${step.heard}」，对吗？`;
    case 'ask':
    case 'failed':
      return step.message || undefined;
    default:
      return undefined;
  }
}

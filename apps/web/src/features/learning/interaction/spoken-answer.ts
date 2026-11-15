import type { Judgement } from '../data-access/useLessonAnswer';
import type { VoiceState } from '../data-access/voice-input';
import type { Words } from './subtitle';
import { spokenNumbers } from './spoken-number';
import { retryable, voiceMessage, type Alternative } from './voice-message';

// What the answer shows next. The microphone opens by itself once the
// question has been told; the child says the answer and confirms the numbers
// that were heard. Tapping numbers is offered only when speech cannot be used
// at all. A guess is recorded rather than found right or wrong.
export type AnswerStep =
  | { kind: 'waiting' }
  | { kind: 'ask'; message: string; choices: boolean }
  | { kind: 'listening' | 'hearing'; message: string }
  | { kind: 'confirm'; heard: string; said: readonly number[] }
  | { kind: 'judging' }
  | { kind: 'failed'; message: string }
  | { kind: 'done'; assisted: boolean }
  | { kind: 'recorded'; said: readonly number[] };

// The lesson's own words for its answer: the unit it is counted in, such as
// 根, and what a wrong answer most likely is, from the numbers the child said.
export type CountWords = { unit?: string; explain: (said: readonly number[]) => string };

// How the answer is taken: `every` asks for every number that answers the
// question, as「六秒和十四秒」, where otherwise one number is the answer.
// `awaiting` tells that the microphone is about to open by itself.
export type Answering = Readonly<{ every?: boolean; awaiting?: boolean }>;

// The microphone on its way to hearing the child, or a try that came to
// nothing heard: listening, hearing, or asking again, with what to tap
// offered once speech has proved unusable.
export type VoiceStep =
  | { kind: 'ask'; message: string; choices: boolean }
  | { kind: 'listening' | 'hearing'; message: string };

// A failed try is tried again by speaking; the numbers are the way round
// speech that cannot be used.
const tappingNumbers: Alternative = { instead: '可以点下面的数字回答。' };

// The answer is listened for, never held for, so its progress has its own words.
const opening = '正在打开麦克风…';
const listening = '我在听，说出你的答案吧。说完停一下就好。';
const cutShort = '这次没录上，可以再说一次。';

export function ask(message: string, choices = false): AnswerStep & VoiceStep {
  return { kind: 'ask', message, choices };
}

function failed(
  state: Extract<VoiceState, { status: 'unavailable' | 'fallback' }>,
  tapping: Alternative,
) {
  if (state.reason === 'short') return ask(cutShort);
  return ask(voiceMessage(state, tapping), !retryable(state));
}

// The child speaking, or what the last try came to: what was heard is read
// by `review`, and `tapping` says what to tap instead of speaking.
function voiceStep<Heard>(
  state: VoiceState,
  tapping: Alternative,
  review: (text: string) => Heard,
): VoiceStep | Heard | undefined {
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
      return review(state.text);
    case 'unavailable':
    case 'fallback':
      return failed(state, tapping);
    default:
      return ask(voiceMessage(state, tapping), state.status === 'guidance');
  }
}

// How something still to say is heard: whether the microphone is about to
// open by itself, what to tap instead of speaking, and how what was heard is
// read.
export type Hearing<Heard> = Readonly<{
  awaiting: boolean;
  tapping: Alternative;
  review: (text: string) => Heard;
}>;

// Whether a step offers what to tap in place of speaking.
const tappingNow = (step: { kind: string }) =>
  step.kind === 'ask' && 'choices' in step && step.choices === true;

// Something still to say: the child speaking, or what the last try came to,
// with `said`, what the teacher says of the last thing sent, until the
// child speaks again. Once speech has proved unusable what to tap stays
// beside it, so a child without a working microphone can keep answering.
export function unsaidStep<Heard extends { kind: string }>(
  voice: VoiceState,
  said: string | undefined,
  { awaiting, tapping, review }: Hearing<Heard>,
) {
  const step = voiceStep(voice, tapping, review);
  if (!step) return awaiting ? ({ kind: 'waiting' } as const) : ask(said ?? '');
  return said && tappingNow(step) ? { ...step, message: said } : step;
}

function review(text: string, unit: string | undefined, every: boolean): AnswerStep {
  const said = spokenNumbers(text, unit);
  if (said && (every || said.length === 1)) return { kind: 'confirm', heard: text, said };
  const again = every ? '再说一次，把每个数都说出来。' : '再说一次，只说数字就好。';
  return ask(`我听到的是「${text}」，没听出是几。${again}`);
}

// Numbers to say, as the final answer and a guess are said: in `unit`, as
// every number that fits when `every`.
export function numbersHeard(
  awaiting: boolean,
  unit: string | undefined,
  every = false,
): Hearing<AnswerStep> {
  return { awaiting, tapping: tappingNumbers, review: (text) => review(text, unit, every) };
}

// What any answer shows while what was sent is on its way: being judged, or
// waiting for a retry once the request failed.
export function sendingStep(
  judgement: Readonly<{ status: string }> & Partial<Readonly<{ message: string }>>,
) {
  if (judgement.status === 'judging') return { kind: 'judging' } as const;
  if (judgement.status === 'failed')
    return { kind: 'failed', message: judgement.message ?? '' } as const;
}

// A judgement the child cannot answer over: being judged, waiting for a retry,
// or a correct answer.
function settled(judgement: Judgement): AnswerStep | undefined {
  const sending = sendingStep(judgement);
  if (sending || judgement.status !== 'judged') return sending;
  const { outcome } = judgement;
  if (outcome === 'independent' || outcome === 'assisted')
    return { kind: 'done', assisted: outcome === 'assisted' };
}

function verdict(judgement: Judgement, explain: CountWords['explain']) {
  if (judgement.status !== 'judged') return undefined;
  if (judgement.outcome === 'incorrect') return explain(judgement.said);
  return '我还不能确定你的答案，再说一次吧。';
}

// What the answer shows next, from the microphone and the server's judgement.
export function answerStep(
  voice: VoiceState,
  judgement: Judgement,
  words: CountWords,
  { every = false, awaiting = false }: Answering = {},
): AnswerStep {
  const said = verdict(judgement, words.explain);
  return settled(judgement) ?? unsaidStep(voice, said, numbersHeard(awaiting, words.unit, every));
}

// The answer given by tapping a number alone, as in a parent's preview, where
// no microphone opens: the numbers are there from the start, beside what
// the last count came to.
export function tappedStep(judgement: Judgement, { explain }: CountWords): AnswerStep {
  return settled(judgement) ?? ask(verdict(judgement, explain) ?? '', true);
}

const hintFailed = '提示暂时打不开，可以再试一次。';

// What the teacher says about the hints: thinking while one is on its way,
// so the last hint is not said again, then the new hint or why none came.
export function hintWords(hints: {
  hint?: string;
  hintWaiting: boolean;
  hintFailed: boolean;
}): Words {
  if (hints.hintWaiting) return { thinking: true };
  return { text: hints.hintFailed ? hintFailed : hints.hint };
}

// Numbers as the teacher reads them out: 9, or 6 和 14, or 3、7 和 9.
export function numberList(said: readonly number[]) {
  const last = said.at(-1);
  if (said.length < 2) return String(last ?? '');
  return `${said.slice(0, -1).join('、')} 和 ${last}`;
}

// What the teacher says about a step of the answer, in its subtitle: the
// numbers it heard, to be confirmed, a correct answer, and what went wrong or
// what to do next. While the child speaks, or waits, the teacher says
// nothing; the answer's own drops show it, as they show a recorded guess.
export function answerWords(step: AnswerStep): string | undefined {
  switch (step.kind) {
    case 'confirm':
      return `我听到你说「${step.heard}」，是 ${numberList(step.said)} 吗？`;
    case 'done':
      return step.assisted
        ? '答对了！这次用了提示，下次试试自己数出来。'
        : '答对了！你自己算出来了。';
    case 'ask':
    case 'failed':
      return step.message || undefined;
    default:
      return undefined;
  }
}

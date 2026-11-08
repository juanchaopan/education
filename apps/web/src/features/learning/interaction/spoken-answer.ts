import type { Judgement } from '../data-access/useLessonAnswer';
import type { VoiceState } from '../data-access/voice-input';
import { spokenNumber } from './spoken-number';

export type { Judgement } from '../data-access/useLessonAnswer';

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

const tapInstead = '可以点下面的数字回答。';

function ask(message: string, choices = false): AnswerStep {
  return { kind: 'ask', message, choices };
}

// Speech that cannot be used for this answer, and what to do instead.
function unusable(state: VoiceState): string | undefined {
  if (state.status === 'unavailable') {
    if (state.reason === 'denied') return `没有拿到麦克风权限。${tapInstead}`;
    if (state.reason === 'unsupported') return `这台设备现在不能录音。${tapInstead}`;
  }
  if (state.status === 'fallback') {
    if (state.reason === 'unauthorized') return `需要家长先同意语音转写。${tapInstead}`;
    if (state.reason !== 'invalid-input') return `现在听不了说话。${tapInstead}`;
  }
  if (state.status === 'guidance') return `好的，不等了。${tapInstead}`;
}

// The child speaking, or what the last try heard.
function speaking(state: VoiceState): AnswerStep | undefined {
  switch (state.status) {
    case 'starting':
      return { kind: 'listening', message: '正在打开麦克风…' };
    case 'recording':
      return { kind: 'listening', message: '正在听。说完点「说完了」。' };
    case 'transcribing':
      return { kind: 'hearing', message: '正在听你说的话…' };
    case 'unheard':
      return ask('没有听清你说的话。再说一次吧。');
    case 'unavailable':
      return ask('这次没有录到声音。再说一次吧。');
    case 'fallback':
      return ask('这段录音太长了，说短一点再试一次。');
    case 'review': {
      const count = spokenNumber(state.text);
      if (count === undefined)
        return ask(`我听到的是「${state.text}」，没听出是几。再说一次，只说数字就好。`);
      return { kind: 'confirm', heard: state.text, count };
    }
    default:
      return undefined;
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
// speech has proved unusable the numbers stay, so a child without a working
// microphone can keep answering.
export function answerStep(
  voice: VoiceState,
  judgement: Judgement,
  explain: (count: number) => string,
): AnswerStep {
  const done = settled(judgement);
  if (done) return done;
  const instead = unusable(voice);
  const said = verdict(judgement, explain);
  if (instead) return ask(said ?? instead, true);
  return speaking(voice) ?? ask(said ?? '');
}

import { transcriptionMaxSeconds, type AiHelpFallback } from '@education/contracts';
import type { VoiceState } from '../data-access/voice-input';
import type { RecorderFailure } from '../voice/recorder';

// What a child can do instead of speaking. `instead` is said when speech
// cannot be used at all; `or` is offered beside trying again, and a page that
// only wants another try leaves it out.
export type Alternative = { instead: string; or?: string };

// Voice is one way to answer, never the only one: by default the child types.
export const typing: Alternative = { instead: '可以直接打字告诉我。', or: '直接打字' };

type Failure = Extract<VoiceState, { status: 'unavailable' | 'fallback' }>;

// Failures of this one recording, which speaking again may get past. The
// others mean speech cannot be used here: no microphone, no consent or no
// transcription service.
const retryReasons = new Set<RecorderFailure | AiHelpFallback>([
  'interrupted',
  'empty',
  'invalid-input',
  'unavailable',
  'timeout',
  'cancelled',
]);

export function retryable(state: Failure) {
  return retryReasons.has(state.reason);
}

function again(alternative: Alternative, attempt: string) {
  return alternative.or ? `可以${attempt}，或者${alternative.or}。` : `可以${attempt}。`;
}

function permission({ instead, or }: Alternative) {
  const browser = '请家长在浏览器里允许使用麦克风。';
  return or ? `可以${or}，或者${browser}` : `${instead}也可以${browser}`;
}

const reasons: Record<RecorderFailure | AiHelpFallback, string> = {
  disabled: '语音转写现在用不了。',
  'missing-key': '语音转写现在用不了。',
  ineligible: '语音转写现在用不了。',
  unauthorized: '需要家长先同意语音转写。',
  'invalid-input': '这段录音没法识别，可能太长了。',
  'usage-limited': '语音转写现在忙不过来了。',
  unavailable: '这次没有听出来。',
  timeout: '识别有点慢，先停下了。',
  cancelled: '已经停下了。',
  unsupported: '这台设备现在不能录音。',
  denied: '没有拿到麦克风权限。',
  interrupted: '录音中断了，这段没有保存。',
  empty: '这次没有录到声音。',
};

function failureMessage(state: Failure, alternative: Alternative) {
  const reason = reasons[state.reason];
  if (state.reason === 'denied') return `${reason}${permission(alternative)}`;
  if (state.reason === 'invalid-input') return `${reason}${again(alternative, '说短一点再试')}`;
  return `${reason}${retryable(state) ? again(alternative, '再录一次') : alternative.instead}`;
}

const progress = {
  idle: '',
  starting: '正在打开麦克风…',
  recording: `正在录音。说完点「说完了」，最长 ${transcriptionMaxSeconds} 秒。`,
  transcribing: '正在听你说的话…',
  review: '我听到的是下面这句。不对的地方可以直接改，改好再点「用这句话」。',
} as const;

export function voiceMessage(state: VoiceState, alternative: Alternative = typing) {
  switch (state.status) {
    case 'unavailable':
    case 'fallback':
      return failureMessage(state, alternative);
    case 'unheard':
      return `没有听清你说的话。${again(alternative, '再说一次')}`;
    case 'guidance':
      return `好的，先不等了。${alternative.instead}`;
    default:
      return progress[state.status];
  }
}

import type { AiHelpFallback } from '@education/contracts';
import type { RecorderFailure } from '../voice/recorder';

// Every message keeps typing open: voice is one way to answer, never the only one.
const resting = '语音转写现在用不了。可以直接打字告诉我。';
const fallbacks: Record<AiHelpFallback, string> = {
  disabled: resting,
  'missing-key': resting,
  ineligible: resting,
  unauthorized: '需要家长先同意语音转写。可以直接打字告诉我。',
  'invalid-input': '这段录音没法识别，可能太长了。可以说短一点再试，或者直接打字。',
  'usage-limited': '语音转写现在忙不过来了。可以直接打字告诉我。',
  unavailable: '这次没有听出来。可以再录一次，或者直接打字。',
  timeout: '识别有点慢，先停下了。可以再录一次，或者直接打字。',
  cancelled: '已经停下了。可以再录一次，或者直接打字。',
};
const failures: Record<RecorderFailure, string> = {
  unsupported: '这台设备现在不能录音。可以直接打字告诉我。',
  denied: '没有拿到麦克风权限。可以直接打字，或者请家长在浏览器里允许使用麦克风。',
  interrupted: '录音中断了，这段没有保存。可以再录一次，或者直接打字。',
  empty: '这次没有录到声音。可以再录一次，或者直接打字。',
};

export function voiceFallbackMessage(reason: AiHelpFallback) {
  return fallbacks[reason];
}

export function recorderFailureMessage(reason: RecorderFailure) {
  return failures[reason];
}

export const unheardMessage = '没有听清你说的话。可以再说一次，或者直接打字。';
export const voiceGuidanceMessage = '好的，先不等了。可以直接打字告诉我。';

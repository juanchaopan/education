import type { AiHelpFallback } from '@education/contracts';

const resting = 'AI 老师现在休息了。你的作答还在，我们用提示继续。';
const copy: Record<AiHelpFallback, string> = {
  disabled: resting,
  'missing-key': resting,
  ineligible: resting,
  unauthorized: '需要家长先同意 AI 帮助。你的作答还在，我们用提示继续。',
  'invalid-input': '这次的内容没法发给 AI 老师。可以少写一点，或者重新画一次。',
  'usage-limited': 'AI 老师现在忙不过来了。你的作答还在，我们用提示继续。',
  unavailable: 'AI 老师这次没有答上来。你的作答还在，我们用提示继续。',
  timeout: 'AI 老师有点慢。你的作答还在，我们先用提示继续。',
  cancelled: '已经停下了。你的作答还在，可以用提示继续。',
};

export function fallbackMessage(reason: AiHelpFallback) {
  return copy[reason];
}

export const guidanceMessage = '好的，我们用提示继续。你的作答还在。';

import type { FeedbackState } from '../data-access/useTeachingFeedback';
import type { VoiceState } from '../data-access/voice-input';
import { fallbackMessage } from '../interaction/ai-help-message';
import { LessonButton as Button } from './LessonButton';
import panel from './LessonPanel.module.css';

type Props = {
  stepId: string;
  voice: VoiceState;
  reply: FeedbackState;
  // What to do next in this scene, shown when the teacher cannot answer.
  guidance: string;
  // The narration held while the child asks, to be carried on afterwards.
  paused: boolean;
  onAsk: () => void;
  onStop: () => void;
  onCancel: () => void;
  onStopWaiting: () => void;
  onResume: () => void;
};

const keepGoing = '我们接着做题吧。';

function voiceMessage(voice: VoiceState) {
  switch (voice.status) {
    case 'starting':
      return '正在打开麦克风…';
    case 'recording':
      return '小兔在听。问完点「问完了」。';
    case 'transcribing':
      return '小兔在听你说的话…';
    case 'unheard':
      return '没有听清，可以再问一次。';
    case 'unavailable':
      return voice.reason === 'denied'
        ? `没有拿到麦克风权限，现在问不了。${keepGoing}`
        : `现在录不了音。${keepGoing}`;
    case 'fallback':
      return voice.reason === 'unauthorized'
        ? `需要家长先同意语音转写，现在问不了。${keepGoing}`
        : `现在听不了问题。${keepGoing}`;
    default:
      return undefined;
  }
}

function replyMessage(stepId: string, reply: FeedbackState, guidance: string) {
  switch (reply.status) {
    case 'pending':
      return '小兔正在想…';
    case 'ready':
      return reply.feedback.stepId === stepId ? reply.feedback.instruction : '';
    case 'fallback':
      return `${fallbackMessage(reply.reason)}${guidance}`;
    case 'guidance':
      return `好的，不等了。${guidance}`;
    default:
      return '';
  }
}

function Actions({ voice, reply, paused, ...on }: Omit<Props, 'stepId' | 'guidance'>) {
  if (voice.status === 'starting' || voice.status === 'recording')
    return (
      <>
        <Button label="问完了" onClick={on.onStop} />
        <Button label="不问了" onClick={on.onCancel} />
      </>
    );
  if (voice.status === 'transcribing' || reply.status === 'pending')
    return <Button label="不等了" onClick={on.onStopWaiting} />;
  return (
    <>
      <Button label="有问题？按一下问小兔" onClick={on.onAsk} />
      {paused && <Button label="接着听小兔讲" onClick={on.onResume} />}
    </>
  );
}

// A question the child asks in the middle of a scene, and the teacher's short
// reply about that scene. When the teacher cannot answer, the scene's own
// guidance is shown instead.
export function LessonQuestionPanel({ stepId, voice, reply, guidance, ...on }: Props) {
  return (
    <section className={panel.panel} aria-label="问问小兔">
      <p role="status" className={panel.message}>
        {voiceMessage(voice) ?? replyMessage(stepId, reply, guidance)}
      </p>
      <div className={panel.actions}>
        <Actions voice={voice} reply={reply} {...on} />
      </div>
    </section>
  );
}

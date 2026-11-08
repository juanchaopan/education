import type { FeedbackState } from '../data-access/useTeachingFeedback';
import type { VoiceState } from '../data-access/voice-input';
import { fallbackMessage } from '../interaction/ai-help-message';
import { feedbackForStep } from '../interaction/lesson-help';
import { voiceMessage, type Alternative } from '../interaction/voice-message';
import { LessonButton as Button } from './LessonButton';
import panel from './LessonPanel.module.css';

type Props = {
  // Who teaches the lesson, as its narration calls them.
  teacher: string;
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

// A question is never needed to go on, so speech that cannot be used only
// sends the child back to the scene.
const carryOn: Alternative = { instead: '我们接着做题吧。' };

function replyMessage({ stepId, reply, guidance, teacher }: Props) {
  switch (reply.status) {
    case 'pending':
      return `${teacher}正在想…`;
    case 'ready':
      return feedbackForStep(stepId, reply.feedback)?.instruction ?? '';
    case 'fallback':
      return `${fallbackMessage(reply.reason)}${guidance}`;
    case 'guidance':
      return `好的，不等了。${guidance}`;
    default:
      return '';
  }
}

function Actions({ voice, reply, paused, teacher, ...on }: Props) {
  if (voice.status === 'starting' || voice.status === 'recording')
    return (
      <>
        <Button label="说完了" onClick={on.onStop} />
        <Button label="不问了" onClick={on.onCancel} />
      </>
    );
  if (voice.status === 'transcribing' || reply.status === 'pending')
    return <Button label="不等了" onClick={on.onStopWaiting} />;
  return (
    <>
      <Button label={`有问题？按一下问${teacher}`} onClick={on.onAsk} />
      {paused && <Button label={`接着听${teacher}讲`} onClick={on.onResume} />}
    </>
  );
}

// A question the child asks in the middle of a scene, and the teacher's short
// reply about that scene. When the teacher cannot answer, the scene's own
// guidance is shown instead.
export function LessonQuestionPanel(props: Props) {
  const { voice, teacher } = props;
  return (
    <section className={panel.panel} aria-label={`问问${teacher}`}>
      <p role="status" className={panel.message}>
        {voice.status === 'idle' ? replyMessage(props) : voiceMessage(voice, carryOn)}
      </p>
      <div className={panel.actions}>
        <Actions {...props} />
      </div>
    </section>
  );
}

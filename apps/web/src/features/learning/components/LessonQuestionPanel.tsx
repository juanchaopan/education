import { feedbackTextMaxLength } from '@education/contracts';
import type { FeedbackState } from '../data-access/useTeachingFeedback';
import type { VoiceState } from '../data-access/voice-input';
import { fallbackMessage } from '../interaction/ai-help-message';
import { voiceMessage, type Alternative } from '../interaction/voice-message';
import { usesMicrophone } from '../voice/microphone-turn';
import { HoldToTalkButton } from './HoldToTalkButton';
import { LessonButton as Button } from './LessonButton';
import panel from './LessonPanel.module.css';
import styles from './LessonQuestionPanel.module.css';

type Props = {
  // Who teaches the lesson, as its narration calls them.
  teacher: string;
  voice: VoiceState;
  // The teacher's answer to the child's latest question, about the scene it
  // was asked in, even when the scene has moved on since.
  reply: FeedbackState;
  // What to do next in this scene, shown when the teacher cannot answer.
  guidance: string;
  // The narration held while the child asks, to be carried on afterwards.
  paused: boolean;
  // Someone else in the lesson is speaking, so the child cannot ask now.
  blocked: boolean;
  // The question is on its way out, or could not be sent.
  sending: boolean;
  sendFailed: boolean;
  onPress: () => void;
  onRelease: () => void;
  onEdit: (text: string) => void;
  onSend: () => void;
  onDrop: () => void;
  onStopWaiting: () => void;
  onResume: () => void;
};

// A question is never needed to go on, so speech that cannot be used only
// sends the child back to the scene.
const carryOn: Alternative = { instead: '我们接着做题吧。' };

function replyMessage({ reply, guidance, teacher }: Props) {
  switch (reply.status) {
    case 'pending':
      return `${teacher}正在想…`;
    case 'ready':
      return reply.feedback.instruction;
    case 'fallback':
      return `${fallbackMessage(reply.reason)}${guidance}`;
    case 'guidance':
      return `好的，不等了。${guidance}`;
    default:
      return '';
  }
}

function message(props: Props) {
  const { voice, teacher, sendFailed } = props;
  if (voice.status === 'idle') return replyMessage(props);
  if (voice.status !== 'review') return voiceMessage(voice, carryOn);
  if (sendFailed) return `暂时连不上，还没发出去。可以再点「发给${teacher}」。`;
  return `${voiceMessage(voice, carryOn)}改好了点「发给${teacher}」。`;
}

// Where the question stands: the child holding the button, waiting for what
// was heard or for the reply, or reading over what was heard.
function stage({ voice, reply }: Props) {
  return {
    holding: usesMicrophone(voice.status),
    waiting: voice.status === 'transcribing' || reply.status === 'pending',
    review: voice.status === 'review' ? voice.text : undefined,
  };
}

function ReviewActions({ teacher, sending, review, ...on }: Props & { review: string }) {
  return (
    <>
      <Button label={`发给${teacher}`} onClick={on.onSend} disabled={sending || !review.trim()} />
      <Button label="不问了" onClick={on.onDrop} disabled={sending} />
    </>
  );
}

function Actions(props: Props) {
  const { teacher, paused, blocked, sending, ...on } = props;
  const { holding, waiting, review } = stage(props);
  return (
    <>
      <HoldToTalkButton
        label={review === undefined ? `有问题？按住问${teacher}` : '按住，再说一次'}
        holding={holding}
        disabled={blocked || waiting || sending}
        onPress={on.onPress}
        onRelease={on.onRelease}
      />
      {review !== undefined && <ReviewActions {...props} review={review} />}
      {waiting && <Button label="不等了" onClick={on.onStopWaiting} />}
      {paused && !holding && !waiting && (
        <Button label={`接着听${teacher}讲`} onClick={on.onResume} />
      )}
    </>
  );
}

// A question the child asks in the middle of a scene by holding the button
// while speaking, then reads over and corrects before sending, and the
// teacher's short reply. When the teacher cannot answer, the scene's own
// guidance is shown instead. The heard text is an ordinary text field, so it
// is never treated as markup.
export function LessonQuestionPanel(props: Props) {
  const { voice, teacher, onEdit } = props;
  return (
    <section className={panel.panel} aria-label={`问问${teacher}`}>
      <p role="status" className={panel.message}>
        {message(props)}
      </p>
      {voice.status === 'review' && (
        <label className={styles.review}>
          <span className={styles.label}>听到的话</span>
          <textarea
            className={styles.text}
            value={voice.text}
            maxLength={feedbackTextMaxLength}
            rows={3}
            onChange={(event) => onEdit(event.target.value)}
          />
        </label>
      )}
      <div className={panel.actions}>
        <Actions {...props} />
      </div>
    </section>
  );
}

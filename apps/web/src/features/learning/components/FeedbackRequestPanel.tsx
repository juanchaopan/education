import type { FeedbackState } from '../data-access/useTeachingFeedback';
import { fallbackMessage, guidanceMessage } from '../interaction/ai-help-message';
import action from './LessonAction.module.css';
import styles from './LessonPanel.module.css';

type Props = {
  state: FeedbackState;
  // Whether the child has written or drawn something worth sending.
  canAsk: boolean;
  onAsk: () => void;
  onGuide: () => void;
};

function message(state: FeedbackState) {
  switch (state.status) {
    case 'pending':
      return 'AI 老师正在看你的作答…';
    case 'fallback':
      return fallbackMessage(state.reason);
    case 'guidance':
      return guidanceMessage;
    case 'ready':
      // A drawing's feedback is read out on the drawing board, beside the outlined region.
      return state.drawing.length ? '' : state.feedback.instruction;
    default:
      return '';
  }
}

export function FeedbackRequestPanel({ state, canAsk, onAsk, onGuide }: Props) {
  const pending = state.status === 'pending';
  return (
    <section className={styles.panel} aria-label="请 AI 老师看一看">
      <p role="status" className={styles.message}>
        {message(state)}
      </p>
      <div className={styles.actions}>
        <button
          type="button"
          className={action.button}
          disabled={!canAsk || pending}
          onClick={onAsk}
        >
          请 AI 老师看一看
        </button>
        {pending && (
          <button type="button" className={action.button} onClick={onGuide}>
            不等了，用提示继续
          </button>
        )}
      </div>
    </section>
  );
}

import { feedbackTextMaxLength } from '@education/contracts';
import { classNames } from '../../../../shared/lib/class-names';
import { Dewdrop } from '../../../../shared/ui/Dewdrop';
import { Spoken } from './Spoken';
import { VoiceMeter } from './VoiceMeter';
import { WaitingDots } from './WaitingDots';
import styles from './QuestionBox.module.css';

// Where the child's question stands: being spoken while the microphone is
// held, being turned into words, read over and corrected, or sent and
// waiting for the teacher's reply.
export type QuestionPhase = 'listening' | 'hearing' | 'review' | 'asked';

type Props = {
  phase: QuestionPhase;
  // The words heard, which the child can correct while reading them over.
  text: string;
  teacher: string;
  level?: () => number;
  // The question is on its way out, or could not be sent.
  sending?: boolean;
  sendFailed?: boolean;
  onEdit: (text: string) => void;
  onSend: () => void;
  // Drops the question, or stops waiting for the words or the reply.
  onClose: () => void;
};

// What the box shows: the voice while it is spoken, dots while it turns into
// words, then the words themselves, which stay as an ordinary text field so
// they are never treated as markup.
function Content({ phase, text, level, onEdit }: Props) {
  switch (phase) {
    case 'listening':
      return (
        <span className={styles.listening} role="status">
          <VoiceMeter level={level} />
          <Spoken>我在听</Spoken>
        </span>
      );
    case 'hearing':
      return (
        <span className={styles.listening} role="status">
          <WaitingDots label="正在听你说了什么" />
        </span>
      );
    default:
      return (
        <textarea
          className={styles.text}
          aria-label="听到的话"
          value={text}
          maxLength={feedbackTextMaxLength}
          rows={1}
          readOnly={phase === 'asked'}
          onChange={(event) => onEdit(event.target.value)}
        />
      );
  }
}

// The cross in the box's corner: it drops the question being read over, or
// stops waiting for the words or the reply.
function Close({ phase, sending = false, onClose }: Props) {
  const waiting = phase === 'hearing' || phase === 'asked';
  return (
    <span className={styles.close}>
      <Dewdrop
        icon="close"
        size="small"
        label={waiting ? '不等了' : '不问了'}
        disabled={sending}
        onClick={onClose}
      />
    </span>
  );
}

function Send({ text, teacher, sending = false, sendFailed = false, onSend }: Props) {
  return (
    <Dewdrop
      icon="send"
      tone="ok"
      label={sendFailed ? `还没发出去，再发给${teacher}` : `发给${teacher}`}
      badge={sendFailed ? '!' : undefined}
      aria-busy={sending || undefined}
      disabled={sending || !text.trim()}
      onClick={onSend}
    />
  );
}

// The box beside the microphone that holds the child's question. Once the
// child lets go, the words appear; tapping them puts the cursor in to correct
// them, and the send drop beside the box sends them.
export function QuestionBox(props: Props) {
  const { phase } = props;
  return (
    <div className={styles.question} data-phase={phase}>
      <div className={classNames(styles.box, phase === 'asked' && styles.asked)}>
        <Content {...props} />
        {phase !== 'listening' && <Close {...props} />}
      </div>
      {phase === 'review' && <Send {...props} />}
    </div>
  );
}

import { Dewdrop } from '../../../../shared/ui/Dewdrop';
import { Spoken } from '../../../../shared/ui/Spoken';
import type { AnswerStep } from '../../interaction/spoken-answer';
import { VoiceMeter } from './VoiceMeter';
import { WaitingDots } from './WaitingDots';
import styles from './AnswerCapsule.module.css';

type Handlers = {
  onListen: () => void;
  onFinish: () => void;
  onStopWaiting: () => void;
  onConfirm: () => void;
  onChoose: (count: number) => void;
  onRetry: () => void;
  onContinue: () => void;
};

type Props = Handlers & {
  // What the count answers, which the teacher has asked out loud.
  question: string;
  step: AnswerStep;
  // The unit the count is said in, such as 根.
  unit?: string;
  // Numbers to tap when speech cannot be used.
  choices: readonly number[];
  // Someone else in the lesson is speaking, so the microphone cannot open.
  blocked: boolean;
  level?: () => number;
};

function Heard({ count, unit }: { count: number; unit?: string }) {
  return (
    <span className={styles.heard}>
      <small>我听到</small>
      <span className={styles.count}>
        {count}
        {unit && <span className={styles.unit}>{unit}</span>}
      </span>
    </span>
  );
}

// The gold star a correct count earns, drawn solid: the line icons are
// outlines, and an earned star is filled.
function Star() {
  return (
    <svg className={styles.star} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 2.8l2.9 5.9 6.4.9-4.6 4.5 1.1 6.4L12 17.5l-5.8 3 1.1-6.4-4.6-4.5 6.4-.9z" />
    </svg>
  );
}

function Choices({ choices, onChoose }: Pick<Props, 'choices' | 'onChoose'>) {
  return (
    <span className={styles.choices} role="group" aria-label="点一个数字回答">
      {choices.map((count) => (
        <Dewdrop
          key={count}
          art={<span className={styles.number}>{count}</span>}
          label={String(count)}
          size="small"
          onClick={() => onChoose(count)}
        />
      ))}
    </span>
  );
}

function SayAgain({
  label,
  blocked,
  onListen,
}: {
  label: string;
  blocked: boolean;
  onListen: () => void;
}) {
  return (
    <Dewdrop
      icon="sayAgain"
      tone="honey"
      size="large"
      label={label}
      disabled={blocked}
      onClick={onListen}
    />
  );
}

function Content({ step, unit, choices, blocked, level, ...on }: Props) {
  switch (step.kind) {
    case 'listening':
      return (
        <>
          <VoiceMeter level={level} />
          <Spoken>{step.message}</Spoken>
          <Dewdrop icon="stop" tone="clay" label="说完了" onClick={on.onFinish} />
        </>
      );
    case 'hearing':
      return (
        <>
          <WaitingDots label="正在听你说了什么" />
          <Dewdrop icon="close" size="small" label="不等了" onClick={on.onStopWaiting} />
        </>
      );
    case 'confirm':
      return (
        <>
          <Heard count={step.count} unit={unit} />
          <Dewdrop
            icon="check"
            tone="ok"
            size="large"
            label={`对，是 ${step.count}`}
            onClick={on.onConfirm}
          />
          <SayAgain label="重说" blocked={blocked} onListen={on.onListen} />
        </>
      );
    case 'judging':
      return <WaitingDots label="正在看你的答案" />;
    case 'failed':
      return (
        <Dewdrop icon="replay" tone="honey" size="large" label="再交一次" onClick={on.onRetry} />
      );
    case 'ask':
      return step.choices ? (
        <Choices choices={choices} onChoose={on.onChoose} />
      ) : (
        <SayAgain label="再说一次" blocked={blocked} onListen={on.onListen} />
      );
    case 'done':
      return (
        <>
          <Star />
          <Dewdrop icon="play" tone="ok" size="large" label="接着看" onClick={on.onContinue} />
        </>
      );
    default:
      return null;
  }
}

// The final answer laid into the stage as a glass capsule: a voice meter and
// a stop drop while the microphone listens by itself, then "我听到 9 根" with
// a green drop to agree and a honey one to say it again. A number that could
// not be heard is said again from the honey drop; once speech has proved
// unusable, numbers to tap take its place. A correct count ends in a star
// and a drop that carries the film on. What the teacher says about each step
// is the teacher's subtitle; the capsule shows only what the child does, and
// tells screen readers the question it answers.
export function AnswerCapsule(props: Props) {
  if (props.step.kind === 'waiting') return null;
  return (
    <section className={styles.capsule} aria-label="说出答案">
      <Spoken>{props.question}</Spoken>
      <Content {...props} />
    </section>
  );
}

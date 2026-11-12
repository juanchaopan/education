import { useState } from 'react';
import { Dewdrop } from '../../../../shared/ui/Dewdrop';
import { Spoken } from '../../../../shared/ui/Spoken';
import { numberList, type AnswerStep } from '../../interaction/spoken-answer';
import { VoiceMeter } from './VoiceMeter';
import { WaitingDots } from './WaitingDots';
import styles from './AnswerCapsule.module.css';

type Handlers = {
  onListen: () => void;
  onFinish: () => void;
  onStopWaiting: () => void;
  onConfirm: () => void;
  onChoose: (said: readonly number[]) => void;
  onRetry: () => void;
  onContinue: () => void;
};

type Props = Handlers & {
  // What the answer answers, which the teacher has asked out loud.
  question: string;
  step: AnswerStep;
  // The unit the answer is said in, such as 根.
  unit?: string;
  // The answer is every number that fits, so the child may say or tap
  // several; otherwise it is one number.
  every?: boolean;
  // Numbers to tap when speech cannot be used.
  choices: readonly number[];
  // Someone else in the lesson is speaking, so the microphone cannot open.
  blocked: boolean;
  level?: () => number;
};

type Choosing = Pick<Props, 'choices' | 'onChoose'>;

function Heard({ said, unit }: { said: readonly number[]; unit?: string }) {
  return (
    <span className={styles.heard}>
      <small>我听到</small>
      <span className={styles.numbers}>
        {said.map((count) => (
          <span key={count} className={styles.count}>
            {count}
            {unit && <span className={styles.unit}>{unit}</span>}
          </span>
        ))}
      </span>
    </span>
  );
}

// The gold star a correct answer earns, drawn solid: the line icons are
// outlines, and an earned star is filled.
function Star() {
  return (
    <svg className={styles.star} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 2.8l2.9 5.9 6.4.9-4.6 4.5 1.1 6.4L12 17.5l-5.8 3 1.1-6.4-4.6-4.5 6.4-.9z" />
    </svg>
  );
}

const numberArt = (count: number) => <span className={styles.number}>{count}</span>;

// One number to tap, which is the answer.
function OneOf({ choices, onChoose }: Choosing) {
  return (
    <span className={styles.choices} role="group" aria-label="点一个数字回答">
      {choices.map((count) => (
        <Dewdrop
          key={count}
          art={numberArt(count)}
          label={String(count)}
          size="small"
          onClick={() => onChoose([count])}
        />
      ))}
    </span>
  );
}

// Every number that fits: each tap lights a number or puts it out again, and
// the lit ones are handed in together, in the order of the row.
function EveryOf({ choices, onChoose }: Choosing) {
  const [lit, setLit] = useState<readonly number[]>([]);
  const chosen = choices.filter((count) => lit.includes(count));
  const toggle = (count: number) =>
    setLit((now) => (now.includes(count) ? now.filter((one) => one !== count) : [...now, count]));
  return (
    <>
      <span className={styles.choices} role="group" aria-label="点亮每一个答案">
        {choices.map((count) => (
          <Dewdrop
            key={count}
            art={numberArt(count)}
            label={String(count)}
            size="small"
            tone={lit.includes(count) ? 'ok' : 'clear'}
            aria-pressed={lit.includes(count)}
            onClick={() => toggle(count)}
          />
        ))}
      </span>
      <Dewdrop
        icon="send"
        tone="ok"
        size="large"
        label={chosen.length ? `交：${numberList(chosen)}` : '交'}
        disabled={!chosen.length}
        onClick={() => onChoose(chosen)}
      />
    </>
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

// What the child does after an answer was not taken: speak again, or, once
// speech has proved unusable, tap the answer.
function Asking({ tapping, every, choices, blocked, ...on }: Props & { tapping: boolean }) {
  if (!tapping) return <SayAgain label="再说一次" blocked={blocked} onListen={on.onListen} />;
  return every ? (
    <EveryOf choices={choices} onChoose={on.onChoose} />
  ) : (
    <OneOf choices={choices} onChoose={on.onChoose} />
  );
}

function Content(props: Props) {
  const { step, unit, blocked, level, ...on } = props;
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
          <Heard said={step.said} unit={unit} />
          <Dewdrop
            icon="check"
            tone="ok"
            size="large"
            label={`对，是 ${numberList(step.said)}`}
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
      return <Asking {...props} tapping={step.choices} />;
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
// a stop drop while the microphone listens by itself, then "我听到 9 根", or
// every number heard when the answer is every number that fits, with a green
// drop to agree and a honey one to say it again. Numbers that could not be
// heard are said again from the honey drop; once speech has proved unusable,
// numbers to tap take its place, one to tap for a single answer, or several
// to light and hand in together. A correct answer ends in a star and a drop
// that carries the film on. What the teacher says about each step is the
// teacher's subtitle; the capsule shows only what the child does, and tells
// screen readers the question it answers.
export function AnswerCapsule(props: Props) {
  if (props.step.kind === 'waiting') return null;
  return (
    <section className={styles.capsule} aria-label="说出答案">
      <Spoken>{props.question}</Spoken>
      <Content {...props} />
    </section>
  );
}

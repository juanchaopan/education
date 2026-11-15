import { Dewdrop } from '../../../../shared/ui/Dewdrop';
import { numberList, type AnswerStep } from '../../interaction/spoken-answer';
import { Capsule, Counts, Heard, SayAgain, Underway } from './capsule-parts';
import { underway } from './capsule-steps';
import { NumberChoices } from './NumberChoices';
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
  // What the child does in the capsule, which names it for screen readers:
  // 说出答案, or 说出你猜的数 for a guess.
  label?: string;
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

// The gold star a correct answer earns, drawn solid: the line icons are
// outlines, and an earned star is filled.
function Star() {
  return (
    <svg className={styles.star} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 2.8l2.9 5.9 6.4.9-4.6 4.5 1.1 6.4L12 17.5l-5.8 3 1.1-6.4-4.6-4.5 6.4-.9z" />
    </svg>
  );
}

// What the child does after an answer was not taken: speak again, or, once
// speech has proved unusable, tap the answer.
function Asking({ tapping, every, choices, blocked, ...on }: Props & { tapping: boolean }) {
  if (!tapping) return <SayAgain label="再说一次" blocked={blocked} onListen={on.onListen} />;
  return <NumberChoices choices={choices} every={every} onChoose={on.onChoose} />;
}

function Content(props: Props) {
  const { step, unit, blocked, ...on } = props;
  if (underway(step)) return <Underway {...on} step={step} judging="正在看你的答案" />;
  switch (step.kind) {
    case 'confirm':
      return (
        <>
          <Heard title="我听到">
            <Counts said={step.said} unit={unit} />
          </Heard>
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
    case 'ask':
      return <Asking {...props} tapping={step.choices} />;
    case 'done':
      return (
        <>
          <Star />
          <Dewdrop icon="play" tone="ok" size="large" label="接着看" onClick={on.onContinue} />
        </>
      );
    case 'recorded':
      return (
        <Heard title="记下了">
          <Counts said={step.said} unit={unit} />
        </Heard>
      );
    default:
      return null;
  }
}

// An answer laid into the stage as a glass capsule: a voice meter and a stop
// drop while the microphone listens by itself, then "我听到 9 根", or every
// number heard when the answer is every number that fits, with a green drop
// to agree and a honey one to say it again. Numbers that could not be heard
// are said again from the honey drop; once speech has proved unusable,
// numbers to tap take its place, one to tap for a single answer, or several
// to light and hand in together. A correct final answer ends in a star and a
// drop that carries the film on; a guess ends recorded, "记下了 6 根", laid
// out as what was heard, neither right nor wrong. What the teacher says
// about each step is the teacher's subtitle; the capsule shows only what the
// child does, and tells screen readers the question it answers.
export function AnswerCapsule({ label = '说出答案', ...props }: Props) {
  if (props.step.kind === 'waiting') return null;
  return (
    <Capsule label={label} question={props.question}>
      <Content {...props} />
    </Capsule>
  );
}

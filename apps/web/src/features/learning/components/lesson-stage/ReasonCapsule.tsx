import { Dewdrop } from '../../../../shared/ui/Dewdrop';
import type { ReasonStep } from '../../interaction/variation-steps';
import { Capsule, Heard, SayAgain, Underway } from './capsule-parts';
import { underway } from './capsule-steps';
import { ReasonChoices, type ChosenReason } from './ReasonChoices';
import styles from './AnswerCapsule.module.css';

type Props = {
  // What the reason answers, which the teacher has asked out loud.
  question: string;
  step: ReasonStep;
  // The lesson's choices to tap by id, with the words each shows.
  choices: Readonly<Record<string, string>>;
  // Someone else in the lesson is speaking, so the microphone cannot open.
  blocked: boolean;
  level?: () => number;
  onListen: () => void;
  onFinish: () => void;
  onStopWaiting: () => void;
  onConfirm: () => void;
  onChoose: (reason: ChosenReason) => void;
  onRetry: () => void;
};

function Content({ step, choices, blocked, ...on }: Props) {
  if (underway(step)) return <Underway {...on} step={step} judging="正在看你说的理由" />;
  switch (step.kind) {
    case 'confirm':
      return (
        <>
          <Heard title="我听到你说">
            <span className={styles.sentence}>『{step.heard}』</span>
          </Heard>
          <Dewdrop icon="check" tone="ok" size="large" label="对" onClick={on.onConfirm} />
          <SayAgain label="重说" blocked={blocked} onListen={on.onListen} />
        </>
      );
    case 'ask':
      return step.choices ? (
        <ReasonChoices choices={choices} onChoose={on.onChoose} />
      ) : (
        <SayAgain label="再说一次" blocked={blocked} onListen={on.onListen} />
      );
    default:
      return null;
  }
}

// The variation's reason laid into the stage as a glass capsule, as the
// answer is: the microphone listening by itself, then "我听到你说：『……』"
// with a green drop to agree and a honey one to say it again. Once speech
// has proved unusable, or two tries in a row came to nothing, two rows of
// words to tap take the honey drop's place. Once the reason is clear the
// capsule is gone, as the lesson moves on to say what it came to.
export function ReasonCapsule(props: Props) {
  const { kind } = props.step;
  if (kind === 'waiting' || kind === 'explained') return null;
  return (
    <Capsule label="说说为什么" question={props.question}>
      <Content {...props} />
    </Capsule>
  );
}

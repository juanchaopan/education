import type { AnswerStep } from '../interaction/spoken-answer';
import { LessonButton as Button } from './LessonButton';
import panel from './LessonPanel.module.css';
import styles from './SpokenAnswerPanel.module.css';

type Handlers = {
  onListen: () => void;
  onFinish: () => void;
  onStopWaiting: () => void;
  onConfirm: () => void;
  onChoose: (count: number) => void;
  onRetry: () => void;
  onHint: () => void;
  onContinue: () => void;
};

type Props = Handlers & {
  question: string;
  step: AnswerStep;
  choices: readonly number[];
  hint?: string;
  hintFailed?: boolean;
  canHint: boolean;
  // Someone else in the lesson is speaking, so the microphone cannot open.
  blocked: boolean;
};

function message(step: AnswerStep) {
  switch (step.kind) {
    case 'waiting':
      return '听完这句话，就可以说出答案了。';
    case 'confirm':
      return `我听到你说「${step.heard}」，是 ${step.count} 吗？`;
    case 'judging':
      return '正在看你的答案…';
    case 'done':
      return step.assisted
        ? '答对了！这次用了提示，下次试试自己数出来。'
        : '答对了！你自己算出来了。';
    default:
      return step.message;
  }
}

function Actions({ step, blocked, ...on }: Handlers & { step: AnswerStep; blocked: boolean }) {
  switch (step.kind) {
    case 'listening':
      return <Button label="说完了" onClick={on.onFinish} />;
    case 'hearing':
      return <Button label="不等了" onClick={on.onStopWaiting} />;
    case 'confirm':
      return (
        <>
          <Button label={`对，是 ${step.count}`} onClick={on.onConfirm} />
          <Button label="不对，再说一次" onClick={on.onListen} disabled={blocked} />
        </>
      );
    case 'failed':
      return <Button label="再交一次" onClick={on.onRetry} />;
    case 'done':
      return <Button label="接着看" onClick={on.onContinue} />;
    case 'ask':
      return <Button label="点这里再说" onClick={on.onListen} disabled={blocked} />;
    default:
      return null;
  }
}

// The final answer of a lesson, said out loud: the microphone listens by
// itself once the question has been told and stops when the child falls
// quiet, or when the child says they are done. The child confirms the number
// that was heard before it counts. Numbers to tap appear only when speech
// cannot be used.
export function SpokenAnswerPanel(props: Props) {
  const { question, step, choices, hint, hintFailed, canHint, ...on } = props;
  const asking = step.kind === 'ask';
  return (
    <section className={panel.panel} aria-label="说出答案">
      <h3 className={styles.question}>{question}</h3>
      <p role="status" className={panel.message}>
        {message(step)}
      </p>
      <div className={panel.actions}>
        <Actions step={step} {...on} />
        {asking && canHint && <Button label="给我一个提示" onClick={on.onHint} />}
      </div>
      {asking && step.choices && (
        <div className={styles.choices} role="group" aria-label="点一个数字回答">
          {choices.map((count) => (
            <button
              key={count}
              type="button"
              className={styles.choice}
              onClick={() => on.onChoose(count)}
            >
              {count}
            </button>
          ))}
        </div>
      )}
      {(hint || hintFailed) && (
        <p className={styles.hint}>{hint ?? '提示暂时打不开，可以再试一次。'}</p>
      )}
    </section>
  );
}

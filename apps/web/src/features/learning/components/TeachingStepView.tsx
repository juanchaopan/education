import type { helpOptions } from '../model';
import styles from './TeachingStepView.module.css';

type Help = ReturnType<typeof helpOptions>;
type HintKind = NonNullable<Help['next']>['kind'];

const hintLabels: Record<HintKind, string> = {
  hint: '看个小提示',
  example: '看个例子',
  demonstration: '看看示范',
};

type Props = {
  progress: string;
  instruction: string;
  headingRef?: (heading: HTMLHeadingElement | null) => void;
  answer: string;
  onAnswer: (answer: string) => void;
  notice?: string;
  helpCount: number;
  shownHint?: Help['shown'];
  nextHint?: HintKind;
  onHint: (kind: HintKind) => void;
  onRepeat: () => void;
  onRetry: () => void;
  checking: boolean;
  onCheck: () => void;
  onConfirm: () => void;
  nextLabel: string;
  onNext: () => void;
};

export function TeachingStepView({ headingRef, ...props }: Props) {
  const { nextHint, shownHint, notice, helpCount } = props;
  return (
    <>
      <p className={styles.progress}>{props.progress}</p>
      <h2 className={styles.instruction} ref={headingRef} tabIndex={-1}>
        {props.instruction}
      </h2>
      <div className={styles.actions}>
        <button type="button" onClick={props.onRepeat}>
          再看指令
        </button>
        <button type="button" onClick={props.onRetry}>
          再试一次
        </button>
        <button
          type="button"
          aria-disabled={!nextHint}
          onClick={() => {
            if (nextHint) props.onHint(nextHint);
          }}
        >
          {nextHint ? hintLabels[nextHint] : '已看到示范'}
        </button>
      </div>
      <label className={styles.answer}>
        我的想法
        <textarea value={props.answer} onChange={(event) => props.onAnswer(event.target.value)} />
      </label>
      <div role="status" className={styles.feedback}>
        {shownHint && <p>{shownHint.instruction}</p>}
        {notice && <p key={helpCount}>{notice}</p>}
      </div>
      <div className={styles.actions}>
        <button type="button" onClick={props.checking ? props.onConfirm : props.onCheck}>
          {props.checking ? '这是我的想法' : '确认我的想法'}
        </button>
        <button type="button" className={styles.next} onClick={props.onNext}>
          {props.nextLabel}
        </button>
      </div>
    </>
  );
}

import { Fragment, type ReactNode } from 'react';
import { classNames } from '../../../../shared/lib/class-names';
import { Spoken } from '../../../../shared/ui/Spoken';
import { amountPlan, piled, type Arrangement, type BoardAmount } from './board-layout';
import styles from './ConclusionBoard.module.css';

// One conclusion on the board: amounts that all weigh the same, the sentence a
// screen reader reads for it, whether the scene or a hint is using it now,
// and whether it supposes a changed condition beside the one before it.
export type BoardFact = Readonly<{
  id: string;
  says: string;
  amounts: readonly BoardAmount[];
  lit: boolean;
  supposed: boolean;
}>;

const counted = (count: number) => Array.from({ length: count }, (_, place) => `${count}-${place}`);

// Copies of something laid out line by line, rows across or columns down.
function Pile({ arrangement, children }: { arrangement: Arrangement; children: ReactNode }) {
  return (
    <span className={styles.pile} data-across={arrangement.across}>
      {arrangement.lines.map((length, line) => (
        <span key={`${line}-${length}`} className={styles.line}>
          {counted(length).map((key) => (
            <Fragment key={key}>{children}</Fragment>
          ))}
        </span>
      ))}
    </span>
  );
}

function Amount({ count, picture, shape, group, times }: BoardAmount) {
  const plan = amountPlan(count, shape, { group, times });
  const things = (
    <Pile arrangement={plan.things}>
      <svg className={styles.picture} focusable="false">
        {picture}
      </svg>
    </Pile>
  );
  return (
    <span className={styles.amount} data-shape={shape} data-piled={piled(plan)}>
      {plan.times !== undefined && <span className={styles.times}>{plan.times}×</span>}
      {plan.frames ? (
        <Pile arrangement={plan.frames}>
          <span className={styles.frame}>{things}</span>
        </Pile>
      ) : (
        things
      )}
    </span>
  );
}

function Fact({ says, amounts, lit, supposed }: BoardFact) {
  return (
    <span
      className={classNames(styles.fact, lit && styles.lit, supposed && styles.supposed)}
      aria-current={lit || undefined}
    >
      <span className={styles.amounts} aria-hidden="true">
        {supposed && <span className={styles.tag}>假如</span>}
        {amounts.map((amount, index) => (
          <Fragment key={amount.key}>
            {index > 0 && <span className={styles.equals}>=</span>}
            <Amount {...amount} />
          </Fragment>
        ))}
      </span>
      <Spoken>{says}</Spoken>
    </span>
  );
}

// A conclusion with the changed conditions that follow it, which stay beside
// it however the board wraps.
function groups(facts: readonly BoardFact[]) {
  const grouped: BoardFact[][] = [];
  for (const fact of facts) {
    const last = grouped.at(-1);
    if (fact.supposed && last) last.push(fact);
    else grouped.push([fact]);
  }
  return grouped;
}

// The conclusions a lesson has found so far, kept in sight across its scenes:
// a row of glass capsules along the top of the picture, each drawn with the
// props themselves, as many as it counts, rather than words or numbers. A new
// one fades in at its place and glows once; the ones the scene or a hint is
// using glow gold. A screen reader reads each as a sentence and hears new
// ones as they arrive.
export function ConclusionBoard({ facts }: { facts: readonly BoardFact[] }) {
  return (
    <ol className={styles.board} aria-label="记住的结论" aria-live="polite">
      {groups(facts).map((group) => (
        <li key={group[0]!.id} className={styles.group}>
          {group.map((fact) => (
            <Fact key={fact.id} {...fact} />
          ))}
        </li>
      ))}
    </ol>
  );
}

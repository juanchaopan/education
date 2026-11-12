import { Fragment, type ReactNode } from 'react';
import { classNames } from '../../../../shared/lib/class-names';
import { Spoken } from '../../../../shared/ui/Spoken';
import styles from './ConclusionBoard.module.css';

// How many of one thing a conclusion weighs out, drawn as the number and a
// small picture of the thing. `key` names it among the amounts of its line.
export type BoardAmount = Readonly<{ key: string; count: number; picture: ReactNode }>;

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

function Amount({ count, picture }: BoardAmount) {
  return (
    <span className={styles.amount}>
      <span className={styles.count}>{count}</span>
      <svg className={styles.picture} focusable="false">
        {picture}
      </svg>
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
// a row of glass capsules along the top of the picture, each written with
// numbers and small pictures of the props rather than words. A new one fades
// in at its place and glows once; the ones the scene or a hint is using
// glow gold. A screen reader reads each as a sentence and hears new ones as
// they arrive.
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

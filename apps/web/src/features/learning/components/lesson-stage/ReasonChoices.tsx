import { useState } from 'react';
import { Dewdrop } from '../../../../shared/ui/Dewdrop';
import { WordDrop } from './WordDrop';
import styles from './ReasonChoices.module.css';

// What the child taps as having stayed the same and as having changed, by
// the ids of the lesson's choices.
export type ChosenReason = Readonly<{ kept: readonly string[]; changed: readonly string[] }>;

type Row = keyof ChosenReason;

const rows: readonly Readonly<{ row: Row; title: string }>[] = [
  { row: 'kept', title: '没变的是' },
  { row: 'changed', title: '变了的是' },
];

const none: ChosenReason = { kept: [], changed: [] };

type Props = {
  // The lesson's choices by id, with the words each drop shows, in order.
  choices: Readonly<Record<string, string>>;
  onChoose: (reason: ChosenReason) => void;
};

// The reason tapped instead of said: two rows of the lesson's choices, one
// over the other, 没变的是 and 变了的是, each choice a long glass drop that
// lights green when tapped, and one drop at the right to hand in what is
// lit, together. A choice may be lit in both rows; the rule judges it.
export function ReasonChoices({ choices, onChoose }: Props) {
  const [lit, setLit] = useState(none);
  const toggle = (row: Row, id: string) =>
    setLit((now) => ({
      ...now,
      [row]: now[row].includes(id) ? now[row].filter((one) => one !== id) : [...now[row], id],
    }));
  const ids = Object.keys(choices);
  const ordered = (row: Row) => ids.filter((id) => lit[row].includes(id));
  const chosen = { kept: ordered('kept'), changed: ordered('changed') };
  const empty = !chosen.kept.length && !chosen.changed.length;
  return (
    <span className={styles.choices}>
      {rows.map(({ row, title }) => (
        <span key={row} className={styles.row} role="group" aria-label={title}>
          <span className={styles.title} aria-hidden="true">
            {title}
          </span>
          {ids.map((id) => (
            <WordDrop
              key={id}
              word={choices[id] ?? id}
              lit={lit[row].includes(id)}
              onToggle={() => toggle(row, id)}
            />
          ))}
        </span>
      ))}
      <span className={styles.send}>
        <Dewdrop
          icon="send"
          tone="ok"
          size="large"
          label="交"
          disabled={empty}
          onClick={() => onChoose(chosen)}
        />
      </span>
    </span>
  );
}

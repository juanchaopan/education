import type { ReactNode } from 'react';
import { Spoken } from '../../../shared/ui/Spoken';
import styles from './ShelfChoices.module.css';

export type ShelfChoice<Value extends string> = Readonly<{
  value: Value;
  label: string;
  // Drawn before the label: an icon or a child's avatar.
  mark?: ReactNode;
  // A thin line before the choice sets it apart from those before it.
  apart?: boolean;
}>;

type Props<Value extends string> = {
  // What the group chooses, said only to screen readers: the page shows the
  // choices without a label.
  legend: string;
  name: string;
  choices: readonly ShelfChoice<Value>[];
  value: Value;
  onChange: (value: Value) => void;
  // Large pills for the shelves and children, a segmented bar for grades and
  // states, and chips for subjects.
  look: 'pill' | 'segment' | 'chip';
};

// One choice among several, as a row of radio buttons drawn as pills that
// scrolls sideways on a narrow screen. The arrow keys move between them as
// in any radio group.
export function ShelfChoices<Value extends string>({
  legend,
  name,
  choices,
  value,
  onChange,
  look,
}: Props<Value>) {
  return (
    <fieldset className={styles.group} data-look={look}>
      <legend>
        <Spoken>{legend}</Spoken>
      </legend>
      {choices.map((choice) => (
        <label
          key={choice.value}
          className={styles.choice}
          data-apart={choice.apart || undefined}
          data-chosen={choice.value === value || undefined}
        >
          <input
            type="radio"
            className={styles.input}
            name={name}
            value={choice.value}
            checked={choice.value === value}
            onChange={() => onChange(choice.value)}
          />
          {choice.mark}
          {choice.label}
        </label>
      ))}
    </fieldset>
  );
}

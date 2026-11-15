import { useState } from 'react';
import { Dewdrop } from '../../../../shared/ui/Dewdrop';
import { numberList } from '../../interaction/spoken-answer';
import styles from './AnswerCapsule.module.css';

type Props = {
  // Numbers to tap when speech cannot be used.
  choices: readonly number[];
  // The answer is every number that fits, so the child lights several;
  // otherwise one tap is the answer.
  every?: boolean;
  onChoose: (said: readonly number[]) => void;
};

const numberArt = (count: number) => <span className={styles.number}>{count}</span>;

// One number to tap, which is the answer.
function OneOf({ choices, onChoose }: Props) {
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
function EveryOf({ choices, onChoose }: Props) {
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

// Numbers to tap in a capsule once speech has proved unusable: one to tap
// for a single answer, or several to light and hand in together.
export function NumberChoices({ every = false, ...props }: Props) {
  return every ? <EveryOf {...props} /> : <OneOf {...props} />;
}

import { Icon } from './Icon';
import type { IconName } from './icons';
import { Dots } from './Loading';
import { Spoken } from './Spoken';
import styles from './AssignToggle.module.css';

type Props = {
  // Whether the book is given to the child now.
  assigned: boolean;
  // A book that is unavailable can only be taken back.
  unavailable?: boolean;
  // While the server has not answered, the button keeps its look but cannot
  // be pressed, with dots for its icon.
  pending?: boolean;
  // Whom the switch is for and which book, which screen readers hear around
  // the words on the button: 为小米安排《学而思》.
  child: string;
  book: string;
  onToggle: () => void;
};

type State = 'open' | 'assigned' | 'withdrawn';

// What the button shows in each state: a given book shows 已安排 at rest and
// 取消安排 under a pointer or the keyboard focus.
const faces: Readonly<Record<State, readonly (readonly [IconName, string, string?])[]>> = {
  open: [['plus', '安排']],
  assigned: [
    ['check', '已安排', 'resting'],
    ['close', '取消安排', 'leaving'],
  ],
  withdrawn: [['close', '取消安排']],
};

// The switch that gives one book to one child or takes it back. It changes
// only once the server has answered, never ahead of it. On a touch screen
// there is no hover, so a tap on 已安排 takes the book back. An unavailable
// book that is given offers only to take it back, and one that is not cannot
// be given. Its name for screen readers always holds the words it shows.
export function AssignToggle({ assigned, unavailable, pending, child, book, onToggle }: Props) {
  if (unavailable && !assigned)
    return (
      <button type="button" className={styles.toggle} data-state="closed" disabled>
        暂时不能安排
      </button>
    );
  const state: State = assigned ? (unavailable ? 'withdrawn' : 'assigned') : 'open';
  const waiting = assigned ? '，正在取消' : '，正在安排';
  return (
    <button
      type="button"
      className={styles.toggle}
      data-state={state}
      aria-pressed={assigned}
      aria-disabled={pending || undefined}
      onClick={() => {
        if (!pending) onToggle();
      }}
    >
      <Spoken>为{child}</Spoken>
      {faces[state].map(([icon, words, face]) => (
        <span key={words} className={styles.face} data-face={face}>
          {pending ? <Dots /> : <Icon name={icon} className={styles.icon} />}
          {words}
        </span>
      ))}
      <Spoken>
        《{book}》{pending ? waiting : ''}
      </Spoken>
    </button>
  );
}

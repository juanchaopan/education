import { finished } from '../lib/book-progress';
import { initialOf } from '../lib/initial';
import { Icon } from './Icon';
import { Spoken } from './Spoken';
import styles from './ProgressTag.module.css';

type Props = {
  // Problems the child has done, and the problems in the book now.
  done: number;
  total: number;
  // The child the progress belongs to, named when several children's tags
  // sit together; their place in the family picks the colour of their disc.
  child?: Readonly<{ name: string; place: number }>;
};

// How far a child has come in a book, as a paper tag on its cover: "5/12",
// or, once the book is finished, a green tag with a tick that says 学完, or
// with a child's name only the tick. Screen readers hear it in words.
export function ProgressTag({ done, total, child }: Props) {
  const complete = finished(done, total);
  const shown = complete ? (child ? '' : '学完') : `${done}/${total}`;
  const spoken = complete ? '学完了' : `做完 ${done} 道，共 ${total} 道`;
  return (
    <span className={styles.tag} data-finished={complete || undefined}>
      {child && (
        <>
          <span className={styles.disc} data-place={child.place % 2} aria-hidden="true">
            {initialOf(child.name)}
          </span>
          <span className={styles.name}>{child.name}</span>
        </>
      )}
      {complete && <Icon name="check" className={styles.tick} />}
      <span aria-hidden="true">{shown}</span>
      <Spoken>{spoken}</Spoken>
    </span>
  );
}

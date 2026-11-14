import { useReadAhead } from '../../../shared/lib/useReadAhead';
import { Button } from '../../../shared/ui/Button';
import { Dots } from '../../../shared/ui/Loading';
import { Spoken } from '../../../shared/ui/Spoken';
import type { FootState } from './foot-state';
import styles from './ShelfFoot.module.css';

type Props = {
  state: FootState;
  // How many books the list holds, said once they are all shown; a list
  // that does not count its books says nothing at its end.
  total?: number;
  onMore: () => void;
};

// The foot of a list of books read batch by batch. The next batch loads by
// itself about a screen before the reader reaches the bottom; the 加载更多
// button stays as the way for the keyboard, screen readers and a batch that
// did not load. It hops while a batch loads, and says when every book is
// shown.
export function ShelfFoot({ state, total, onMore }: Props) {
  const foot = useReadAhead<HTMLDivElement>(state === 'more', onMore);
  if (state === 'done')
    return total === undefined ? null : (
      <p className={styles.foot} role="status">
        一共 {total} 本，都在这里了
      </p>
    );
  return (
    <div ref={foot} className={styles.foot}>
      {state === 'loading' && (
        <p role="status" className={styles.line}>
          <Dots />
          <Spoken>正在加载下一批书</Spoken>
        </p>
      )}
      {state === 'failed' && (
        <p role="alert" className={styles.line}>
          这一批没加载出来
        </p>
      )}
      <Button
        variant={state === 'failed' ? 'primary' : 'secondary'}
        disabled={state === 'loading'}
        onClick={onMore}
      >
        加载更多
      </Button>
    </div>
  );
}

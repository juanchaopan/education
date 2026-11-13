import { useReadAhead } from '../../../shared/lib/useReadAhead';
import { Dots } from '../../../shared/ui/Loading';
import { RaisedButton } from '../../../shared/ui/RaisedButton';
import type { FootState } from './foot-state';
import styles from './BookListFoot.module.css';

type Props = {
  state: FootState;
  // On a touch device the next books come by themselves as the child nears
  // the bottom; with a mouse the child presses 加载更多.
  touch: boolean;
  onMore: () => void;
};

// The foot of the child's books. On a touch device the next six load about a
// screen before the bottom, with a placeholder book and hopping dots; with a
// mouse a raised 加载更多 sinks flat while they load. A batch that did not
// load is said, with a way to try again, on either; once every book is shown
// the foot says so.
export function BookListFoot({ state, touch, onMore }: Props) {
  const foot = useReadAhead<HTMLDivElement>(touch && state === 'more', onMore);
  if (state === 'done') return <p className={styles.foot}>都在这里了</p>;
  if (state === 'failed')
    return (
      <div className={styles.foot}>
        <p role="alert" className={styles.line}>
          这一批没加载出来
        </p>
        <RaisedButton onClick={onMore}>再试一次</RaisedButton>
      </div>
    );
  if (touch)
    return (
      <div ref={foot} className={styles.foot}>
        {state === 'loading' && (
          <>
            <div className={styles.ghost} aria-hidden="true" />
            <p role="status" className={styles.line}>
              <Dots />
              加载中…
            </p>
          </>
        )}
      </div>
    );
  return (
    <div className={styles.foot}>
      <RaisedButton disabled={state === 'loading'} onClick={onMore}>
        {state === 'loading' ? (
          <>
            <Dots />
            加载中…
          </>
        ) : (
          '加载更多'
        )}
      </RaisedButton>
    </div>
  );
}

import { Actions } from '../../shared/ui/Actions';
import { Button } from '../../shared/ui/Button';
import { Notice } from '../../shared/ui/Notice';
import styles from './UpdateNotice.module.css';

type Props = {
  // held: the update waits for unsaved work to be saved; stuck: the page
  // reloaded for the update but is not the new release yet.
  phase: 'held' | 'stuck';
  onRetry: () => void;
};

// Tells the child or parent that the site has an update the page is waiting
// to take, and why, and that nothing they did is lost.
export function UpdateNotice({ phase, onRetry }: Props) {
  return (
    <aside className={styles.notice} aria-label="网站更新">
      <Notice as="div">
        <p>
          {phase === 'held'
            ? '更新已准备好，保存后将自动更新。'
            : '新版本还没准备好。刚才做的和登录都还在。'}
        </p>
        {phase === 'stuck' && (
          <Actions>
            <Button variant="secondary" onClick={onRetry}>
              再试一次
            </Button>
          </Actions>
        )}
      </Notice>
    </aside>
  );
}

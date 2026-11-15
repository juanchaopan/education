import { useNavigate } from 'react-router-dom';
import { EmptyState } from '../shared/ui/EmptyState';
import styles from './NotFoundPage.module.css';

// A path that leads nowhere: the empty state's swaying sprout, its title as
// the page's, and the way back to the home page.
export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className={styles.missing}>
      <EmptyState
        icon="sprout"
        headingLevel={1}
        title="这条小路还没找到"
        actionLabel="回到首页"
        onAction={() => void navigate('/')}
      />
    </div>
  );
}

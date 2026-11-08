import { UpdateNotice } from './UpdateNotice';
import { useReleaseUpdate } from './useReleaseUpdate';
import styles from './ReleaseUpdate.module.css';

// Keeps the open page on the release the deployment serves. The page shows
// a notice only while an update waits on the child: for work to be saved, or
// for another try once a reload did not bring the new release.
export function ReleaseUpdate() {
  const update = useReleaseUpdate();
  if (update.phase !== 'held' && update.phase !== 'stuck') return null;
  return (
    <div className={styles.dock}>
      <UpdateNotice phase={update.phase} onRetry={update.retry} />
    </div>
  );
}

import { Icon } from '../../../shared/ui/Icon';
import styles from './PreviewMark.module.css';

// The mark a parent's preview carries beside the back button the whole time,
// on the lesson's smoked glass: an eye and 预览 in gold. A screen reader hears
// 预览模式 as it reaches the mark, right after the back button.
export function PreviewMark() {
  return (
    <span className={styles.mark}>
      <Icon name="eye" />
      预览<span className={styles.unseen}>模式</span>
    </span>
  );
}

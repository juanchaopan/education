import { Icon } from '../../../shared/ui/Icon';
import { StatusBadge } from './StatusBadge';
import styles from './ParentAddress.module.css';

// The parent's address on a soft tile, badged with whether it is verified.
export function ParentAddress({ email, verified }: { email: string; verified: boolean }) {
  return (
    <p className={styles.account}>
      <Icon name="mail" className={styles.mail} />
      <span className={styles.address}>{email}</span>
      <StatusBadge tone={verified ? 'ok' : 'wait'}>{verified ? '已验证' : '待验证'}</StatusBadge>
    </p>
  );
}

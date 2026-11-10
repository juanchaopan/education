import { Icon } from '../../../shared/ui/Icon';
import { IconButton } from '../../../shared/ui/IconButton';
import { Loading } from '../../../shared/ui/Loading';
import { MoreInfo } from '../../../shared/ui/MoreInfo';
import styles from './FamilyCodeChip.module.css';

export type FamilyCodeChipProps = {
  code?: string;
  loading?: boolean;
  failed?: boolean;
  // How the last copy went, said once beside the chip.
  notice?: string;
  onCopy: () => void;
};

// The family's code on a chip with a copy button, and a "?" for what it is
// for. A family gets its code when its first child joins, so before that
// there is nothing to show.
export function FamilyCodeChip({ code, loading, failed, notice, onCopy }: FamilyCodeChipProps) {
  if (loading) return <Loading label="正在读取家庭码…" />;
  if (failed) return <p role="status">家庭码暂时读不出来，请刷新页面。</p>;
  if (!code) return null;
  return (
    <div className={styles.code}>
      <p className={styles.chip}>
        <Icon name="home" className={styles.icon} />
        <output aria-label="家庭码" className={styles.value}>
          {code}
        </output>
        <IconButton icon="copy" label="复制家庭码" onClick={onCopy} />
      </p>
      <MoreInfo label="家庭码">
        孩子登录时填家庭码。它固定不变，重置 PIN 后也一样；注册 KEY 只用来加入家庭。
      </MoreInfo>
      {notice && (
        <p role="status" className={styles.notice}>
          {notice}
        </p>
      )}
    </div>
  );
}

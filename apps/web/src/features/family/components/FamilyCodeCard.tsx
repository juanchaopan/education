import { IconButton } from '../../../shared/ui/IconButton';
import { Loading } from '../../../shared/ui/Loading';
import { ParentCard } from './ParentCard';
import styles from './FamilyCodeCard.module.css';

type Props = {
  code?: string;
  loading?: boolean;
  failed?: boolean;
  // How the last copy went, said once under the code.
  notice?: string;
  onCopy: () => void;
};

// The family code large enough to read out, with its copy button and the one
// thing a parent mixes it up with. A family gets its code when its first
// child joins, so before that the card says there is none yet.
export function FamilyCodeCard({ code, loading, failed, notice, onCopy }: Props) {
  return (
    <ParentCard titleId="family-code-title" icon="home" title="家庭码">
      {loading && <Loading label="正在读取家庭码…" />}
      {failed && <p role="status">家庭码暂时读不出来，请刷新页面。</p>}
      {!loading && !failed && !code && (
        <p className={styles.hint}>第一个孩子加入家庭后，这里会有家庭码。</p>
      )}
      {code && (
        <>
          <p className={styles.code}>
            <output aria-label="家庭码" className={styles.value}>
              {code}
            </output>
            <IconButton icon="copy" label="复制家庭码" onClick={onCopy} />
          </p>
          <p className={styles.hint}>孩子登录时填，不是注册 KEY。</p>
          {notice && (
            <p role="status" className={styles.hint}>
              {notice}
            </p>
          )}
        </>
      )}
    </ParentCard>
  );
}

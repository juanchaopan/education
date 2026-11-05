import styles from './RegistrationForm.module.css';
import keyStyles from './RegistrationKeyCard.module.css';
export type FamilyCodeCardProps = {
  code?: string;
  loading?: boolean;
  failed?: boolean;
  notice?: string;
  onCopy: () => void;
};
export function FamilyCodeCard({ code, loading, failed, notice, onCopy }: FamilyCodeCardProps) {
  return (
    <section className={`${styles.card} ${keyStyles.panel}`} aria-labelledby="family-code-title">
      <h2 id="family-code-title">我的家庭码</h2>
      <p>家庭码固定不变，可以随时回来查看或复制，不需要背下来。</p>
      {loading ? (
        <p role="status">正在读取家庭码…</p>
      ) : failed ? (
        <p role="status">暂时无法读取，请刷新页面再试。</p>
      ) : code ? (
        <>
          <p>
            <output aria-label="家庭码">{code}</output>
          </p>
          <button type="button" onClick={onCopy}>
            复制家庭码
          </button>
          {notice && <p role="status">{notice}</p>}
        </>
      ) : (
        <p>孩子首次成功注册后，家庭码会显示在这里。</p>
      )}
      <p className={styles.hint}>
        家庭码用于后续孩子登录；一次性注册 KEY 只用来加入家庭。孩子登录将在下一版本开放。
      </p>
    </section>
  );
}

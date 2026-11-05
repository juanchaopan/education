import type { ChildSession } from '@education/contracts';
import styles from './RegistrationForm.module.css';
export type ChildAccountProps = {
  session: ChildSession;
  pending?: boolean;
  error?: string;
  onLogout: () => void;
};
export function ChildAccount({ session, pending, error, onLogout }: ChildAccountProps) {
  return (
    <section className={styles.card} aria-labelledby="child-account-title">
      <span className={styles.symbol} aria-hidden="true">
        ✳
      </span>
      <h2 id="child-account-title">{session.nickname}，欢迎回来！</h2>
      <p>你已登录自己的空间，下次打开通常可以直接回来。</p>
      <p className={styles.notice}>题目正在准备中。有了题目后，我们就一起慢慢探索。</p>
      {error && <p role="alert">{error}</p>}
      <button type="button" disabled={pending} onClick={onLogout}>
        {pending ? '正在退出…' : '退出，换一个人'}
      </button>
    </section>
  );
}

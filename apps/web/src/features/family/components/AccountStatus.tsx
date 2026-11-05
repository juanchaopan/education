import type { ParentSession } from '@education/contracts';
import styles from './RegistrationForm.module.css';
export type AccountStatusProps = {
  session: ParentSession;
  pending?: boolean;
  error?: string;
  refreshing?: boolean;
  onLogout: () => void;
};
export function AccountStatus({
  session,
  pending,
  error,
  refreshing,
  onLogout,
}: AccountStatusProps) {
  const verified = session.access === 'verified';
  const notice = session.emailVerified
    ? '邮箱已验证，请重新登录以更新账号权限。'
    : '请先完成邮箱验证，再管理家庭。请在下方发送验证邮件；验证前，孩子注册和学习资料不可访问。';
  return (
    <section className={styles.card} aria-labelledby="account-title">
      <h2 id="account-title">我的家长账号</h2>
      <p>{session.email}</p>
      <p role="status">
        {session.emailVerified ? '邮箱已验证' : '邮箱待验证，仅可查看账号验证状态'}
      </p>
      <p>{verified ? '您已安全登录，可以在下方管理孩子的注册 KEY 和登录 PIN。' : notice}</p>
      {refreshing && <p role="status">暂时无法刷新账号状态，请稍后重试。</p>}
      {error && (
        <p role="alert" className={styles.notice}>
          {error}
        </p>
      )}
      <button type="button" onClick={onLogout} disabled={pending}>
        {pending ? '正在退出…' : '退出账号'}
      </button>
    </section>
  );
}

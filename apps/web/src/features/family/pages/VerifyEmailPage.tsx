import { useEffect, useState } from 'react';
import { StandaloneLink } from '../../../shared/ui/StandaloneLink';
import { useConfirmVerification } from '../data-access/useVerification';
import styles from '../components/RegistrationForm.module.css';

function takeToken() {
  const token = new URLSearchParams(window.location.hash.slice(1)).get('token') ?? '';
  return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : '';
}
export function VerifyEmailPage() {
  const [token, setToken] = useState(takeToken);
  const confirm = useConfirmVerification();
  useEffect(() => {
    window.history.replaceState(window.history.state, '', window.location.pathname);
  }, []);
  const submit = () => {
    if (!token || confirm.isPending) return;
    confirm.mutate(token, { onSuccess: () => setToken('') });
  };
  return (
    <section className={styles.card} aria-labelledby="verify-email-title">
      <h1 id="verify-email-title">验证家长邮箱</h1>
      {confirm.isSuccess ? (
        <p role="status">邮箱验证成功。请返回家长空间，退出后重新登录，即可更新账号权限。</p>
      ) : token ? (
        <>
          <p>确认这是您申请注册的家长账号后，再点击下面的按钮。打开页面本身不会验证账号。</p>
          <button type="button" disabled={confirm.isPending} onClick={submit}>
            {confirm.isPending ? '正在验证…' : '确认验证邮箱'}
          </button>
        </>
      ) : (
        <p role="status">没有有效的验证链接。请从邮件中重新打开，或登录家长账号重新发送。</p>
      )}
      {confirm.error && <p role="alert">{confirm.error.message}</p>}
      <StandaloneLink to="/family">返回家长空间</StandaloneLink>
    </section>
  );
}

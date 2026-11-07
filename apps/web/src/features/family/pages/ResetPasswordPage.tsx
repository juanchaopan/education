import { useEffect, useState } from 'react';
import { passwordIssue } from '@education/contracts';
import { StandaloneLink } from '../../../shared/ui/StandaloneLink';
import { PasswordResetForm } from '../components/PasswordResetForm';
import { usePasswordReset } from '../data-access/useRecovery';
function takeToken() {
  const value = new URLSearchParams(window.location.hash.slice(1)).get('token') ?? '';
  return /^[A-Za-z0-9_-]{43}$/.test(value) ? value : '';
}
export function ResetPasswordPage() {
  const [token, setToken] = useState(takeToken);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const reset = usePasswordReset();
  useEffect(() => {
    window.history.replaceState(window.history.state, '', window.location.pathname);
  }, []);
  const submit = () => {
    if (reset.isPending || !token) return;
    const issue = passwordIssue(password);
    if (issue || password !== confirmation) {
      setError(issue ?? '两次密码不一致，请再检查一下。');
      return;
    }
    setError('');
    reset.mutate(
      { token, password },
      {
        onSuccess: () => {
          setToken('');
          setPassword('');
          setConfirmation('');
          setDone(true);
          reset.reset();
        },
        onError: (error) => {
          setError(error.message);
          reset.reset();
        },
      },
    );
  };
  return (
    <>
      {done ? (
        <section>
          <h1>密码已更新</h1>
          <p role="status">旧登录状态已失效。请返回家长空间，用新密码登录。</p>
        </section>
      ) : token ? (
        <PasswordResetForm
          password={password}
          confirmation={confirmation}
          pending={reset.isPending}
          error={error}
          onPasswordChange={setPassword}
          onConfirmationChange={setConfirmation}
          onSubmit={submit}
        />
      ) : (
        <section>
          <h1>请从恢复邮件打开</h1>
          <p role="status">
            没有有效的恢复链接。刷新后需要从邮件重新打开，打开页面本身不会修改密码。
          </p>
        </section>
      )}
      {!done && (
        <p>
          <StandaloneLink to="/family/recover">重新申请恢复邮件</StandaloneLink>
        </p>
      )}
      <StandaloneLink to="/family">返回家长空间</StandaloneLink>
    </>
  );
}

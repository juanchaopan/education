import { useState } from 'react';
import { PasswordReset, passwordIssue } from '@education/contracts';
import { Icon } from '../../../shared/ui/Icon';
import { Notice } from '../../../shared/ui/Notice';
import { StandaloneLink } from '../../../shared/ui/StandaloneLink';
import { AccountLayout, type AccountArt } from '../components/AccountLayout';
import { BackToFamily } from '../components/BackToFamily';
import { PasswordResetForm } from '../components/PasswordResetForm';
import { readLinkToken, useForgetLinkToken } from '../data-access/link-token';
import { usePasswordReset } from '../data-access/useRecovery';

// Sets a new password from the recovery mail's link. Opening the link changes
// nothing; only the parent's own submit does.
export function ResetPasswordPage({ art }: { art: AccountArt }) {
  const [token, setToken] = useState(() => readLinkToken(PasswordReset.properties.token));
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const reset = usePasswordReset();
  useForgetLinkToken();
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
  const footer = (
    <>
      {!done && (
        <StandaloneLink to="/family/recover">
          <Icon name="mail" />
          重新申请恢复邮件
        </StandaloneLink>
      )}
      <BackToFamily />
    </>
  );
  if (done)
    return (
      <AccountLayout art={art} titleId="reset-done-title" title="密码已更新" footer={footer}>
        <Notice tone="success">旧登录状态已失效，请用新密码登录。</Notice>
      </AccountLayout>
    );
  if (!token)
    return (
      <AccountLayout art={art} titleId="reset-link-title" title="请从恢复邮件打开" footer={footer}>
        <p role="status">没有有效的恢复链接。请从邮件重新打开，刷新页面后也需要重新打开。</p>
      </AccountLayout>
    );
  return (
    <AccountLayout art={art} titleId="reset-title" title="设置新的家长密码" footer={footer}>
      <PasswordResetForm
        password={password}
        confirmation={confirmation}
        pending={reset.isPending}
        error={error}
        onPasswordChange={setPassword}
        onConfirmationChange={setConfirmation}
        onSubmit={submit}
      />
    </AccountLayout>
  );
}

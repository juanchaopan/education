import { useState } from 'react';
import { Button } from '../../../shared/ui/Button';
import { Notice } from '../../../shared/ui/Notice';
import { AccountLayout, type AccountArt } from '../components/AccountLayout';
import { BackToFamily } from '../components/BackToFamily';
import { readLinkToken, useForgetLinkToken } from '../data-access/link-token';
import { useConfirmVerification } from '../data-access/useVerification';

// Confirms a parent's email from the verification mail's link. Opening the
// link verifies nothing; the parent confirms it is their own sign-up first.
export function VerifyEmailPage({ art }: { art: AccountArt }) {
  const [token, setToken] = useState(readLinkToken);
  const confirm = useConfirmVerification();
  useForgetLinkToken();
  const submit = () => {
    if (!token || confirm.isPending) return;
    confirm.mutate(token, { onSuccess: () => setToken('') });
  };
  return (
    <AccountLayout
      art={art}
      titleId="verify-email-title"
      title="验证家长邮箱"
      footer={<BackToFamily />}
    >
      {confirm.isSuccess ? (
        <Notice tone="success">邮箱验证成功。回到家长空间，退出后重新登录即可。</Notice>
      ) : token ? (
        <>
          <p>确认这是您自己申请注册的家长账号，再点下面的按钮。</p>
          <Button disabled={confirm.isPending} onClick={submit}>
            {confirm.isPending ? '正在验证…' : '确认验证邮箱'}
          </Button>
        </>
      ) : (
        <p role="status">没有有效的验证链接。请从邮件重新打开，或登录后重新发送。</p>
      )}
      {confirm.error && <Notice tone="error">{confirm.error.message}</Notice>}
    </AccountLayout>
  );
}

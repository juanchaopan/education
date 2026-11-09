import { useState } from 'react';
import { preload } from 'react-dom';
import { Brand } from '../../../shared/ui/Brand';
import { Button } from '../../../shared/ui/Button';
import { Icon } from '../../../shared/ui/Icon';
import { Loading } from '../../../shared/ui/Loading';
import { Notice } from '../../../shared/ui/Notice';
import { Page } from '../../../shared/ui/Page';
import { StandaloneLink } from '../../../shared/ui/StandaloneLink';
import { AccountLayout, type AccountArt } from '../components/AccountLayout';
import { AccountNotices } from '../components/AccountNotices';
import { AccountStatus, type AccountStatusProps } from '../components/AccountStatus';
import { FamilyDeleted } from '../components/FamilyDeleted';
import { useParentLogout, useParentSession } from '../data-access/useParentSession';
import { AiConsentPanel } from './AiConsentPanel';
import { ChildAccessPanel } from './ChildAccessPanel';
import { FamilyDeletionPanel } from './FamilyDeletionPanel';
import { FamilyExportPanel } from './FamilyExportPanel';
import { LearningSummaryPanel } from './LearningSummaryPanel';
import { LoginPanel } from './LoginPanel';
import { ParentPracticePanel } from './ParentPracticePanel';
import { RegistrationKeyPanel } from './RegistrationKeyPanel';
import { RegistrationPanel } from './RegistrationPanel';
import { VerificationPanel } from './VerificationPanel';
import styles from './FamilyPage.module.css';

type Mode = 'register' | 'login';

// The parents' entrance. Signed out, it is the sign-up or the sign-in; signed
// in before the email is verified, it is the verification step; verified, it
// is the parent space. A finished deletion signs the page out and keeps
// saying so until the parent moves on to register a new family. The scene's
// backdrop starts loading while the page still asks who is signed in.
export function FamilyPage({ art }: { art: AccountArt }) {
  const [mode, setMode] = useState<Mode>('register');
  const [deleted, setDeleted] = useState(false);
  const session = useParentSession();
  const logout = useParentLogout();
  preload(art.backdrop, { as: 'image', fetchPriority: 'high' });
  if (deleted)
    return (
      <AccountLayout art={art} titleId="family-deleted-title" title="家庭已删除">
        <FamilyDeleted
          onRegister={() => {
            setDeleted(false);
            setMode('register');
          }}
        />
      </AccountLayout>
    );
  if (session.isPending)
    return (
      <div className={styles.waiting}>
        <Loading label="正在确认登录状态…" />
      </div>
    );
  if (!session.data)
    return <SignedOut art={art} mode={mode} failed={session.isError} onMode={setMode} />;
  const { csrfToken } = session.data;
  const account: AccountStatusProps = {
    session: session.data,
    pending: logout.isPending,
    error: logout.error?.message,
    refreshing: session.isError,
    onLogout: () => {
      if (logout.isPending) return;
      logout.mutate(csrfToken, {
        onSuccess: () => {
          setMode('login');
          logout.reset();
        },
      });
    },
  };
  if (session.data.access === 'verified')
    return <ParentSpace {...account} onDeleted={() => setDeleted(true)} />;
  return <Unverified art={art} {...account} />;
}

// Sign-up first, since most parents arrive here new; one button switches to
// the sign-in and back. The switch stays the same button in the same place,
// so it keeps the focus.
function SignedOut({
  art,
  mode,
  failed,
  onMode,
}: {
  art: AccountArt;
  mode: Mode;
  failed: boolean;
  onMode: (mode: Mode) => void;
}) {
  const login = mode === 'login';
  return (
    <AccountLayout
      art={art}
      titleId={login ? 'login-title' : 'registration-title'}
      title={login ? '家长登录' : '创建家长账号'}
      footer={
        <>
          {login && (
            <StandaloneLink to="/family/recover">
              <Icon name="lock" />
              忘记密码
            </StandaloneLink>
          )}
          <Button variant="text" onClick={() => onMode(login ? 'register' : 'login')}>
            {login ? '还没有账号？去注册' : '已有账号？去登录'}
          </Button>
        </>
      }
    >
      {failed && <Notice tone="error">暂时无法恢复登录状态，请稍后刷新或重新登录。</Notice>}
      {login ? <LoginPanel /> : <RegistrationPanel />}
    </AccountLayout>
  );
}

// A parent signed in whose account is not verified yet sees only the
// verification step and the way to sign out. Once the mail link is confirmed,
// the step says so, and signing in again opens the parent space.
function Unverified({
  art,
  session,
  pending,
  error,
  refreshing,
  onLogout,
}: AccountStatusProps & { art: AccountArt }) {
  return (
    <AccountLayout
      art={art}
      titleId="verification-title"
      title="验证家长邮箱"
      footer={
        <Button variant="text" disabled={pending} onClick={onLogout}>
          <Icon name="logout" />
          {pending ? '正在退出…' : '退出账号'}
        </Button>
      }
    >
      <AccountNotices refreshing={refreshing} error={error} />
      <VerificationPanel csrf={session.csrfToken} email={session.email} />
    </AccountLayout>
  );
}

// The panels of a verified parent. Most start over with each renewed session;
// export and deletion renew the session themselves and keep their state across it.
function ParentSpace({ onDeleted, ...account }: AccountStatusProps & { onDeleted: () => void }) {
  const csrf = account.session.csrfToken;
  return (
    <div className={styles.space}>
      <Brand />
      <Page titleId="family-title" title="家长空间">
        <AccountStatus {...account} />
        <LearningSummaryPanel key={`summary-${csrf}`} csrf={csrf} />
        <ParentPracticePanel key={`practice-${csrf}`} csrf={csrf} />
        <AiConsentPanel key={`ai-consent-${csrf}`} csrf={csrf} />
        <RegistrationKeyPanel key={csrf} csrf={csrf} />
        <ChildAccessPanel key={`children-${csrf}`} csrf={csrf} />
        <FamilyExportPanel csrf={csrf} />
        <FamilyDeletionPanel csrf={csrf} onDeleted={onDeleted} />
      </Page>
    </div>
  );
}

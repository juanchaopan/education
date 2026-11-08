import { useState } from 'react';
import { Button } from '../../../shared/ui/Button';
import { Loading } from '../../../shared/ui/Loading';
import { Page } from '../../../shared/ui/Page';
import { AccountStatus } from '../components/AccountStatus';
import { FamilyDeleted } from '../components/FamilyDeleted';
import { useParentSession, useParentLogout } from '../data-access/useParentSession';
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

export function FamilyPage() {
  const [mode, setMode] = useState<'register' | 'login'>('register');
  // A finished deletion signs the page out; this keeps saying so until the
  // parent moves on to register a new family.
  const [deleted, setDeleted] = useState(false);
  const session = useParentSession();
  const logout = useParentLogout();
  const leave = () => {
    if (logout.isPending || !session.data) return;
    logout.mutate(session.data.csrfToken, {
      onSuccess: () => {
        setMode('login');
        logout.reset();
      },
    });
  };
  return (
    <Page titleId="family-title" title="家长空间">
      <p>陪伴每一次尝试，看见一点一滴的进步。</p>
      {deleted ? (
        <FamilyDeleted
          onRegister={() => {
            setDeleted(false);
            setMode('register');
          }}
        />
      ) : session.isPending ? (
        <Loading label="正在确认登录状态…" />
      ) : session.data ? (
        <>
          <AccountStatus
            session={session.data}
            pending={logout.isPending}
            error={logout.error?.message}
            refreshing={session.isError}
            onLogout={leave}
          />
          {session.data.access === 'verified' && (
            <FamilyManagement csrf={session.data.csrfToken} onDeleted={() => setDeleted(true)} />
          )}
          {!session.data.emailVerified && <VerificationPanel csrf={session.data.csrfToken} />}
        </>
      ) : (
        <>
          {session.isError && <p role="status">暂时无法恢复登录状态，请稍后刷新或重新登录。</p>}
          <Button
            variant="secondary"
            onClick={() => setMode(mode === 'register' ? 'login' : 'register')}
          >
            {mode === 'register' ? '已有账号？去登录' : '还没有账号？去注册'}
          </Button>
          {mode === 'register' ? <RegistrationPanel /> : <LoginPanel />}
        </>
      )}
    </Page>
  );
}

// The panels of a verified parent. Most start over with each renewed session;
// export and deletion renew the session themselves and keep their state across it.
function FamilyManagement({ csrf, onDeleted }: { csrf: string; onDeleted: () => void }) {
  return (
    <>
      <LearningSummaryPanel key={`summary-${csrf}`} csrf={csrf} />
      <ParentPracticePanel key={`practice-${csrf}`} csrf={csrf} />
      <AiConsentPanel key={`ai-consent-${csrf}`} csrf={csrf} />
      <RegistrationKeyPanel key={csrf} csrf={csrf} />
      <ChildAccessPanel key={`children-${csrf}`} csrf={csrf} />
      <FamilyExportPanel csrf={csrf} />
      <FamilyDeletionPanel csrf={csrf} onDeleted={onDeleted} />
    </>
  );
}

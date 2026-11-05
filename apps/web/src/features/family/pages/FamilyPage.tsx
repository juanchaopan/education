import { RegistrationKeyPanel } from './RegistrationKeyPanel';
import { VerificationPanel } from './VerificationPanel';
import styles from './FamilyPage.module.css';
import { useState } from 'react';
import { RegistrationPanel } from './RegistrationPanel';
import { LoginPanel } from './LoginPanel';
import { AccountStatus } from '../components/AccountStatus';
import { useParentSession, useParentLogout } from '../data-access/useParentSession';

export function FamilyPage() {
  const [mode, setMode] = useState<'register' | 'login'>('register');
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
    <section aria-labelledby="family-title">
      <h1 id="family-title">家长空间</h1>
      <p>陪伴每一次尝试，看见一点一滴的进步。</p>
      {session.isPending ? (
        <p role="status">正在确认登录状态…</p>
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
            <RegistrationKeyPanel key={session.data.csrfToken} csrf={session.data.csrfToken} />
          )}
          {!session.data.emailVerified && <VerificationPanel csrf={session.data.csrfToken} />}
        </>
      ) : (
        <>
          {session.isError && <p role="status">暂时无法恢复登录状态，请稍后刷新或重新登录。</p>}
          <button
            className={styles.switch}
            type="button"
            onClick={() => setMode(mode === 'register' ? 'login' : 'register')}
          >
            {mode === 'register' ? '已有账号？去登录' : '还没有账号？去注册'}
          </button>
          {mode === 'register' ? <RegistrationPanel /> : <LoginPanel />}
        </>
      )}
    </section>
  );
}

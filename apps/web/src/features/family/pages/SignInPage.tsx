import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { returnPath, signInPath, type SignInTab } from '../../../shared/lib/sign-in-path';
import { Icon } from '../../../shared/ui/Icon';
import { LinkButton } from '../../../shared/ui/LinkButton';
import { Loading } from '../../../shared/ui/Loading';
import { Notice } from '../../../shared/ui/Notice';
import { StandaloneLink } from '../../../shared/ui/StandaloneLink';
import { AccountLayout, type AccountArt } from '../components/AccountLayout';
import { ChildLoginForm, type ChildLoginFields } from '../components/ChildLoginForm';
import { ForgotPin } from '../components/ForgotPin';
import { SignInTabs } from '../components/SignInTabs';
import { rememberedChild, rememberChild } from '../data-access/child-locator';
import { useChildLogin, useChildSession } from '../data-access/useChildSession';
import { useParentSession } from '../data-access/useParentSession';
import { LoginPanel } from './LoginPanel';
import styles from './SignInPage.module.css';

// The sign-in: the child's and the parent's, as two tabs, each at its own
// address. Switching tabs keeps the page to come back to and what a child's
// registration handed on, and takes the place of the tab left in the
// history, so going back leaves the sign-in. Signing in goes on to that page,
// or to the child's books or the parent space; a child arriving signed in
// goes straight on, a parent arriving signed in is offered the way on.
export function SignInPage({ art, tab }: { art: AccountArt; tab: SignInTab }) {
  const navigate = useNavigate();
  const { search, state } = useLocation();
  const next = returnPath(new URLSearchParams(search).get('next'));
  return (
    <AccountLayout
      art={art}
      titleId="sign-in-title"
      title="登录"
      titleHidden
      footer={tab === 'child' ? <ChildWaysOn /> : <ParentWaysOn />}
    >
      <SignInTabs
        tab={tab}
        onTab={(chosen) =>
          void navigate({ pathname: signInPath(chosen), search }, { replace: true, state })
        }
      >
        {tab === 'child' ? <ChildSignIn next={next} /> : <ParentSignIn next={next} />}
      </SignInTabs>
    </AccountLayout>
  );
}

function ChildWaysOn() {
  return (
    <>
      <StandaloneLink to="/join">
        <Icon name="key" />有 KEY？去注册
      </StandaloneLink>
      <ForgotPin />
    </>
  );
}

function ParentWaysOn() {
  return (
    <>
      <StandaloneLink to="/signup">创建账号</StandaloneLink>
      <StandaloneLink to="/password/forgot">
        <Icon name="lock" />
        忘记密码
      </StandaloneLink>
    </>
  );
}

// A child already signed in goes straight on. When it could not be found out
// whether one is, the child can still sign in and is told the account is
// safe.
function ChildSignIn({ next }: { next?: string }) {
  const session = useChildSession();
  if (session.isPending) return <Loading label="正在确认登录状态…" />;
  if (session.data) return <Navigate to={next ?? '/books'} replace />;
  return (
    <>
      {session.isError && (
        <Notice tone="error">暂时无法确认登录状态，请稍后刷新。你的账号不会丢失。</Notice>
      )}
      <ChildLogin />
    </>
  );
}

// The child's sign-in starts from the family code and nickname a child just
// registered with, or those this device remembers. Once the child is signed
// in, the session it brings sends the page on.
function ChildLogin() {
  const location = useLocation();
  const [fields, setFields] = useState<ChildLoginFields>(() => {
    const state = location.state as { familyCode?: unknown; nickname?: unknown } | null;
    if (typeof state?.familyCode === 'string' && typeof state?.nickname === 'string')
      return { familyCode: state.familyCode, nickname: state.nickname, pin: '' };
    return { ...rememberedChild(), pin: '' };
  });
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string>();
  const login = useChildLogin();
  const change = (field: keyof ChildLoginFields, value: string) => {
    setFields((current) => ({ ...current, [field]: value }));
    setError(undefined);
  };
  const submit = () => {
    if (login.isPending) return;
    setError(undefined);
    login.mutate(fields, {
      onSuccess: () => rememberChild(fields, remember),
      onError: (failure) => setError(failure.message),
      onSettled: () => setFields((current) => ({ ...current, pin: '' })),
    });
  };
  return (
    <ChildLoginForm
      {...fields}
      remember={remember}
      onRemember={(value) => {
        setRemember(value);
        if (!value) rememberChild(fields, false);
      }}
      pending={login.isPending}
      error={error}
      onChange={change}
      onSubmit={submit}
    />
  );
}

// A parent already signed in is offered the way on; otherwise the parent
// signs in here and goes on. A session that could not be read is said once,
// above the form, since the parent can still sign in.
function ParentSignIn({ next = '/family' }: { next?: string }) {
  const session = useParentSession();
  const navigate = useNavigate();
  if (session.isPending) return <Loading label="正在确认登录状态…" />;
  if (session.data)
    return (
      <div className={styles.signedIn}>
        <p>已经登录家长账号</p>
        <LinkButton to={next}>进入家长空间</LinkButton>
      </div>
    );
  return (
    <>
      {session.isError && <Notice>暂时无法恢复登录状态，请稍后刷新或重新登录。</Notice>}
      <LoginPanel onSignedIn={() => void navigate(next, { replace: true })} />
    </>
  );
}

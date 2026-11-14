import { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { returnPath } from '../../../shared/lib/problem-path';
import { Icon } from '../../../shared/ui/Icon';
import { LinkButton } from '../../../shared/ui/LinkButton';
import { Loading } from '../../../shared/ui/Loading';
import { Notice } from '../../../shared/ui/Notice';
import { StandaloneLink } from '../../../shared/ui/StandaloneLink';
import { AccountLayout, type AccountArt } from '../components/AccountLayout';
import { ChildLoginForm, type ChildLoginFields } from '../components/ChildLoginForm';
import { ForgotPin } from '../components/ForgotPin';
import { SignInTabs, type SignInTab } from '../components/SignInTabs';
import { rememberedChild, rememberChild } from '../data-access/child-locator';
import { useChildLogin } from '../data-access/useChildSession';
import { useParentSession } from '../data-access/useParentSession';
import { LoginPanel } from './LoginPanel';
import styles from './SignInPage.module.css';

type Props = {
  art: AccountArt;
  // Whether it could not be found out if a child is signed in; the child can
  // still sign in, and is told the account is safe.
  failed?: boolean;
};

// The home page for someone not signed in as a child: the child's sign-in and
// the parent's, as two tabs. The tab chosen is kept in the address, the
// child's by default. A sign-in on the way to a problem returns to it.
export function SignInPage({ art, failed }: Props) {
  const [query, setQuery] = useSearchParams();
  const tab: SignInTab = query.get('tab') === 'parent' ? 'parent' : 'child';
  const choose = (chosen: SignInTab) =>
    setQuery(
      (current) => {
        const next = new URLSearchParams(current);
        if (chosen === 'parent') next.set('tab', 'parent');
        else next.delete('tab');
        return next;
      },
      { replace: true },
    );
  return (
    <AccountLayout
      art={art}
      titleId="sign-in-title"
      title="登录"
      titleHidden
      footer={tab === 'child' ? <ChildWaysOn /> : <ParentWaysOn />}
    >
      <SignInTabs tab={tab} onTab={choose}>
        {tab === 'child' ? (
          <>
            {failed && (
              <Notice tone="error">暂时无法确认登录状态，请稍后刷新。你的账号不会丢失。</Notice>
            )}
            <ChildSignIn />
          </>
        ) : (
          <ParentSignIn next={returnPath(query.get('next'))} />
        )}
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
      <StandaloneLink to="/family">创建账号</StandaloneLink>
      <StandaloneLink to="/family/recover">
        <Icon name="lock" />
        忘记密码
      </StandaloneLink>
    </>
  );
}

// The child's sign-in starts from the family code and nickname a child just
// registered with, or those this device remembers. Once signed in, the home
// page turns into the child's books, or the problem the child came for.
function ChildSignIn() {
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

// A parent already signed in goes on to the parent space; otherwise the
// parent signs in here and goes on to the problem they came for, or to the
// parent space.
function ParentSignIn({ next }: { next?: string }) {
  const session = useParentSession();
  const navigate = useNavigate();
  if (session.isPending) return <Loading label="正在确认登录状态…" />;
  if (session.data)
    return (
      <div className={styles.signedIn}>
        <p>已经登录家长账号</p>
        <LinkButton to="/family">进入家长空间</LinkButton>
      </div>
    );
  return <LoginPanel onSignedIn={() => navigate(next ?? '/family', { replace: true })} />;
}

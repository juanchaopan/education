import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { StandaloneLink } from '../../../shared/ui/StandaloneLink';
import { ChildLoginForm, type ChildLoginFields } from '../components/ChildLoginForm';
import { ChildAccount } from '../components/ChildAccount';
import { ChildPracticePanel } from './ChildPracticePanel';
import { useChildSession, useChildLogin, useChildLogout } from '../data-access/useChildSession';
import { rememberedChild, rememberChild } from '../data-access/child-locator';

export function ChildPage() {
  const location = useLocation();
  const [fields, setFields] = useState<ChildLoginFields>(() => {
    const locator = rememberedChild();
    const state = location.state as { familyCode?: unknown; nickname?: unknown } | null;
    if (typeof state?.familyCode === 'string' && typeof state?.nickname === 'string')
      return { familyCode: state.familyCode, nickname: state.nickname, pin: '' };
    return { ...locator, pin: '' };
  });
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string>();
  const session = useChildSession(),
    login = useChildLogin(),
    logout = useChildLogout();
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
      onSettled: () => {
        setFields((current) => ({ ...current, pin: '' }));
        login.reset();
      },
    });
  };
  const leave = () => {
    if (logout.isPending || !session.data) return;
    logout.mutate(session.data.csrfToken, {
      onSuccess: () => setError(undefined),
      onSettled: () => logout.reset(),
      onError: (failure) => setError(failure.message),
    });
  };
  return (
    <section aria-labelledby="child-space-title">
      <h1 id="child-space-title">我的探索空间</h1>
      {session.isPending ? (
        <p role="status">正在打开你的空间…</p>
      ) : session.isError ? (
        <p role="alert">暂时无法确认登录状态，请稍后刷新。你的账号不会丢失。</p>
      ) : session.data ? (
        <>
          <ChildAccount
            session={session.data}
            pending={logout.isPending}
            error={error}
            onLogout={leave}
          />
          <ChildPracticePanel key={session.data.csrfToken} csrf={session.data.csrfToken} />
        </>
      ) : (
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
      )}
      <p>
        <StandaloneLink to="/join">第一次来？用家长给的 KEY 注册</StandaloneLink>
      </p>
      <p>
        <StandaloneLink to="/family">请家长帮忙</StandaloneLink>
      </p>
    </section>
  );
}

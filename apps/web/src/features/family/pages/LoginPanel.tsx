import { Link } from 'react-router-dom';
import { useState } from 'react';
import { LoginForm } from '../components/LoginForm';
import { useParentLogin } from '../data-access/useParentSession';
export function LoginPanel() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useParentLogin();
  const submit = () => {
    if (login.isPending) return;
    login.mutate(
      { email, password },
      {
        onSuccess: () => {
          setPassword('');
          login.reset();
        },
      },
    );
  };
  return (
    <>
      <LoginForm
        email={email}
        password={password}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onSubmit={submit}
        pending={login.isPending}
        error={login.error?.message}
      />
      <Link to="/family/recover">忘记密码？通过邮箱找回</Link>
    </>
  );
}

import { useState } from 'react';
import { LoginForm } from '../components/LoginForm';
import { useParentLogin } from '../data-access/useParentSession';

// Signs the parent in. The password is cleared once it has been used, and a
// failed attempt keeps what was typed so the parent can correct it.
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
    <LoginForm
      email={email}
      password={password}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onSubmit={submit}
      pending={login.isPending}
      error={login.error?.message}
    />
  );
}

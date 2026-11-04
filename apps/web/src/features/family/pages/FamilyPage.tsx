import { useState } from 'react';
import { passwordIssue } from '@education/contracts';
import { RegistrationForm } from '../components/RegistrationForm';
import { useRegistration, useRegistrationStatus } from '../data-access/useRegistration';

export function FamilyPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validation, setValidation] = useState<string>();
  const [submitted, setSubmitted] = useState(false);
  const registration = useRegistration();
  const status = useRegistrationStatus();
  const submit = () => {
    if (registration.isPending || submitted) return;
    const issue = passwordIssue(password);
    setValidation(issue);
    if (!issue)
      registration.mutate(
        { email, password },
        {
          onSuccess: () => {
            setPassword('');
            setSubmitted(true);
            registration.reset();
          },
        },
      );
  };
  const notice = status.isPending
    ? '正在连接注册服务…'
    : status.isError
      ? '暂时无法连接注册服务，请稍后刷新重试。'
      : !status.data
        ? '注册服务尚未配置，请稍后再来。'
        : undefined;
  return (
    <section aria-labelledby="family-title">
      <h1 id="family-title">家长空间</h1>
      <p>陪伴每一次尝试，看见一点一滴的进步。</p>
      <RegistrationForm
        email={email}
        password={password}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onSubmit={submit}
        pending={registration.isPending}
        submitted={submitted}
        available={status.data}
        notice={notice}
        error={validation ?? registration.error?.message}
      />
    </section>
  );
}

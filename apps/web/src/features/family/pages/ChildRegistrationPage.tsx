import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ChildRegistrationReceipt } from '@education/contracts';
import { ChildRegistrationForm } from '../components/ChildRegistrationForm';
import { ChildRegistrationSuccess } from '../components/ChildRegistrationSuccess';
import { useChildRegistration } from '../data-access/useChildRegistration';

export function ChildRegistrationPage() {
  const [fields, setFields] = useState({ registrationKey: '', nickname: '', pin: '' });
  const requestId = useRef(crypto.randomUUID());
  const [receipt, setReceipt] = useState<ChildRegistrationReceipt>();
  const [error, setError] = useState<string>();
  const registration = useChildRegistration();
  const change = (field: keyof typeof fields, value: string) => {
    setFields((current) => ({ ...current, [field]: value }));
    requestId.current = crypto.randomUUID();
    setError(undefined);
  };
  const submit = () => {
    if (registration.isPending || receipt) return;
    setError(undefined);
    registration.mutate(
      {
        requestId: requestId.current,
        key: fields.registrationKey,
        nickname: fields.nickname,
        pin: fields.pin,
      },
      {
        onSuccess: (result) => {
          setReceipt(result);
          setFields({ registrationKey: '', nickname: '', pin: '' });
        },
        onError: (failure) => setError(failure.message),
        onSettled: () => registration.reset(),
      },
    );
  };
  return (
    <section aria-labelledby="child-title">
      <h1 id="child-title">孩子注册</h1>
      {receipt ? (
        <>
          <ChildRegistrationSuccess receipt={receipt} />
          <p>
            <Link
              to="/child"
              state={{ familyCode: receipt.familyCode, nickname: receipt.nickname }}
            >
              去孩子登录
            </Link>
          </p>
        </>
      ) : (
        <ChildRegistrationForm
          {...fields}
          pending={registration.isPending}
          error={error}
          onChange={change}
          onSubmit={submit}
        />
      )}
      <p>
        <Link to="/family">请家长帮忙，前往家长空间</Link>
      </p>
    </section>
  );
}

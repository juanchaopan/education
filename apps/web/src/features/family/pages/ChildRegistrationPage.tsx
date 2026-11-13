import { useRef, useState } from 'react';
import type { ChildRegistrationReceipt } from '@education/contracts';
import { Page } from '../../../shared/ui/Page';
import { StandaloneLink } from '../../../shared/ui/StandaloneLink';
import { ChildRegistrationForm } from '../components/ChildRegistrationForm';
import { ChildRegistrationSuccess } from '../components/ChildRegistrationSuccess';
import { useChildRegistration } from '../data-access/useChildRegistration';

// A child joins the family with the KEY a parent gave. Once registered, the
// way on is the home page's sign-in, already holding the family code and the
// nickname.
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
    <Page titleId="child-title" title="孩子注册">
      {receipt ? (
        <>
          <ChildRegistrationSuccess receipt={receipt} />
          <p>
            <StandaloneLink
              to="/"
              state={{ familyCode: receipt.familyCode, nickname: receipt.nickname }}
            >
              去孩子登录
            </StandaloneLink>
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
        <StandaloneLink to="/family">请家长帮忙，前往家长空间</StandaloneLink>
      </p>
    </Page>
  );
}

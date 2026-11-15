import { useRef, useState } from 'react';
import type { ChildRegistrationReceipt } from '@education/contracts';
import { signInPath } from '../../../shared/lib/sign-in-path';
import { StandaloneLink } from '../../../shared/ui/StandaloneLink';
import { AccountLayout, type AccountArt } from '../components/AccountLayout';
import {
  ChildRegistrationForm,
  type ChildRegistrationFields,
} from '../components/ChildRegistrationForm';
import { ChildRegistrationSuccess } from '../components/ChildRegistrationSuccess';
import { useChildRegistration } from '../data-access/useChildRegistration';

const empty: ChildRegistrationFields = { registrationKey: '', nickname: '', pin: '' };

// A child joins the family with the KEY a parent gave, on the account pages'
// scene. A request sent again after an unsure answer keeps its id, so the
// server replays it rather than registering twice; any change to the fields
// makes it a new request. Once registered, nothing typed is kept, and the way
// on is the child's sign-in, already holding the family code and nickname.
export function ChildRegistrationPage({ art }: { art: AccountArt }) {
  const [fields, setFields] = useState(empty);
  const requestId = useRef(crypto.randomUUID());
  const [receipt, setReceipt] = useState<ChildRegistrationReceipt>();
  const [error, setError] = useState<string>();
  const registration = useChildRegistration();
  const change = (field: keyof ChildRegistrationFields, value: string) => {
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
          setFields(empty);
        },
        onError: (failure) => setError(failure.message),
        onSettled: () => registration.reset(),
      },
    );
  };
  if (receipt)
    return (
      <AccountLayout art={art} titleId="child-joined-title" title="你已加入家庭！">
        <ChildRegistrationSuccess receipt={receipt} />
      </AccountLayout>
    );
  return (
    <AccountLayout
      art={art}
      titleId="child-registration-title"
      title="加入家庭"
      footer={<StandaloneLink to={signInPath('child')}>已有账号？去登录</StandaloneLink>}
    >
      <ChildRegistrationForm
        {...fields}
        pending={registration.isPending}
        error={error}
        onChange={change}
        onSubmit={submit}
      />
    </AccountLayout>
  );
}

import { useState } from 'react';
import type { RecoveryRequest } from '@education/contracts';
import { Icon } from '../../../shared/ui/Icon';
import { StandaloneLink } from '../../../shared/ui/StandaloneLink';
import { AccountLayout, type AccountArt } from '../components/AccountLayout';
import { RecoveryForm } from '../components/RecoveryForm';
import { useRecoveryRequest } from '../data-access/useRecovery';

// Requests a recovery mail. The address is the only thing kept between
// attempts; each result is cleared from the request as soon as it is shown.
export function RecoveryPage({ art }: { art: AccountArt }) {
  const [email, setEmail] = useState('');
  const [received, setReceived] = useState(false);
  const [error, setError] = useState('');
  const request = useRecoveryRequest();
  const submit = (action: RecoveryRequest['action']) => {
    if (request.isPending) return;
    setError('');
    request.mutate(
      { email, action },
      {
        onSuccess: () => {
          setReceived(true);
          request.reset();
        },
        onError: (error) => {
          setError(error.message);
          request.reset();
        },
      },
    );
  };
  return (
    <AccountLayout
      art={art}
      titleId="recovery-title"
      title="找回家长密码"
      footer={
        <StandaloneLink to="/family">
          <Icon name="back" />
          返回家长空间
        </StandaloneLink>
      }
    >
      <RecoveryForm
        email={email}
        received={received}
        error={error}
        pending={request.isPending}
        onEmailChange={(value) => {
          setEmail(value);
          setReceived(false);
          setError('');
        }}
        onSubmit={submit}
      />
    </AccountLayout>
  );
}

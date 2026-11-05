import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { RecoveryRequest } from '@education/contracts';
import { RecoveryForm } from '../components/RecoveryForm';
import { useRecoveryRequest } from '../data-access/useRecovery';
export function RecoveryPage() {
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
    <>
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
      <Link to="/family">返回家长空间</Link>
    </>
  );
}

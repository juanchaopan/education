import { useState } from 'react';
import { AiConsentCard } from '../components/AiConsentCard';
import { useAiConsent } from '../data-access/useAiConsent';
import { useParentReauthentication } from '../data-access/useParentReauthentication';

export function AiConsentPanel({ csrf }: { csrf: string }) {
  const { status, change } = useAiConsent(csrf);
  const confirm = useParentReauthentication(csrf);
  const [password, setPassword] = useState('');
  const pending = status.isFetching || change.isPending || confirm.isPending;
  return (
    <AiConsentCard
      view={status.isError ? undefined : status.data}
      loading={status.isFetching}
      pending={pending}
      error={status.error?.message ?? change.error?.message ?? confirm.error?.message}
      password={password}
      onPassword={setPassword}
      onConfirm={() => {
        if (pending) return;
        change.reset();
        confirm.mutate(password);
        setPassword('');
      }}
      onChange={(decision) => {
        if (!pending) change.mutate(decision);
      }}
      onRefresh={() => {
        change.reset();
        confirm.reset();
        setPassword('');
        void status.refetch();
      }}
    />
  );
}

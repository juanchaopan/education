import { useState } from 'react';
import { FamilyDeletionCard } from '../components/FamilyDeletionCard';
import { useFamilyDeletion } from '../data-access/useFamilyDeletion';
import { useParentReauthentication } from '../data-access/useParentReauthentication';

// Each deletion confirms the parent password first; the confirmation renews the
// session, so the deletion is sent with the CSRF token of the renewed session.
// A new attempt replaces the last result only once the password is confirmed,
// so a mistyped password does not hide that a deletion is already pending.
export function FamilyDeletionPanel({ csrf, onDeleted }: { csrf: string; onDeleted: () => void }) {
  const confirm = useParentReauthentication(csrf);
  const deletion = useFamilyDeletion(onDeleted);
  const [phrase, setPhrase] = useState('');
  const [password, setPassword] = useState('');
  const pending = confirm.isPending || deletion.isPending;
  return (
    <FamilyDeletionCard
      pending={pending}
      recorded={deletion.data === 'pending'}
      error={confirm.error?.message ?? deletion.error?.message}
      phrase={phrase}
      password={password}
      onPhrase={setPhrase}
      onPassword={setPassword}
      onDelete={() => {
        if (pending) return;
        confirm.mutate(password, {
          onSuccess: (session) =>
            deletion.mutate({ csrf: session.csrfToken, confirmation: phrase }),
        });
        setPassword('');
      }}
    />
  );
}

import { useState } from 'react';
import { FamilyExportCard } from '../components/FamilyExportCard';
import { useFamilyExport } from '../data-access/useFamilyExport';
import { useParentReauthentication } from '../data-access/useParentReauthentication';

// Each export confirms the parent password first; the confirmation renews the
// session, so the export is sent with the CSRF token of the renewed session.
export function FamilyExportPanel({ csrf }: { csrf: string }) {
  const confirm = useParentReauthentication(csrf);
  const exported = useFamilyExport();
  const [password, setPassword] = useState('');
  const pending = confirm.isPending || exported.isPending;
  return (
    <FamilyExportCard
      pending={pending}
      preparing={exported.isPending}
      saved={exported.data}
      error={confirm.error?.message ?? exported.error?.message}
      password={password}
      onPassword={setPassword}
      onExport={() => {
        if (pending) return;
        exported.reset();
        confirm.mutate(password, { onSuccess: (session) => exported.mutate(session.csrfToken) });
        setPassword('');
      }}
    />
  );
}

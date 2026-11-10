import type { ParentSession } from '@education/contracts';
import { VerificationNotice } from '../components/VerificationNotice';
import { useSendVerification, useVerification } from '../data-access/useVerification';

// Where the verification mail stands for the signed-in parent, and sending it.
export function VerificationPanel({ session }: { session: ParentSession }) {
  const status = useVerification(session.csrfToken);
  const send = useSendVerification(session.csrfToken);
  return (
    <VerificationNotice
      email={session.email}
      verified={session.emailVerified}
      status={status.data}
      loading={status.isPending}
      pending={send.isPending}
      error={send.error?.message ?? status.error?.message}
      onSend={(action) => {
        if (!send.isPending) send.mutate(action);
      }}
      onRefresh={() => {
        send.reset();
        void status.refetch();
      }}
    />
  );
}

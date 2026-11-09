import { VerificationNotice } from '../components/VerificationNotice';
import { useSendVerification, useVerification } from '../data-access/useVerification';

// Where the verification mail stands for the signed-in parent, and sending it.
export function VerificationPanel({ csrf, email }: { csrf: string; email: string }) {
  const status = useVerification(csrf);
  const send = useSendVerification(csrf);
  return (
    <VerificationNotice
      email={email}
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

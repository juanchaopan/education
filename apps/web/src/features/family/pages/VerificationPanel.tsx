import { VerificationNotice } from '../components/VerificationNotice';
import { useVerification, useSendVerification } from '../data-access/useVerification';
export function VerificationPanel({ csrf }: { csrf: string }) {
  const status = useVerification(csrf);
  const send = useSendVerification(csrf);
  return (
    <VerificationNotice
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

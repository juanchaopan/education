import { useParentReauthentication } from '../data-access/useParentReauthentication';
import { FamilyCodePanel } from './FamilyCodePanel';
import type { RegistrationKeyStatus } from '@education/contracts';
import { useState } from 'react';
import { RegistrationKeyCard } from '../components/RegistrationKeyCard';
import { useRegistrationKey, useManageRegistrationKey } from '../data-access/useRegistrationKey';
export function RegistrationKeyPanel({ csrf }: { csrf: string }) {
  const status = useRegistrationKey(csrf);
  const manage = useManageRegistrationKey(csrf);
  const confirm = useParentReauthentication(csrf);
  const [password, setPassword] = useState('');
  const [shown, setShown] = useState<{ id: string; value: string } | null>(null);
  const [copyNotice, setCopyNotice] = useState('');
  const [confirmationError, setConfirmationError] = useState('');
  const pending = manage.isPending || confirm.isPending;
  const value = visibleKey(status.isSuccess && !status.isFetching ? status.data : undefined, shown);
  const clear = () => {
    setShown(null);
    setCopyNotice('');
  };
  const change = (action: { type: 'generate' } | { type: 'revoke'; id: string }) => {
    if (pending) return;
    clear();
    manage.mutate(action, {
      onSuccess: (result) => {
        if (result) setShown({ id: result.key.id, value: result.value });
        manage.reset();
      },
    });
  };
  const copy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopyNotice('已复制，请交给孩子妥善使用。');
    } catch {
      setCopyNotice('暂时无法自动复制，请长按或选中上面的 KEY 复制。');
    }
  };
  return (
    <>
      <FamilyCodePanel
        key={status.data?.familyCode}
        code={status.isSuccess && !status.isFetching ? status.data.familyCode : undefined}
        loading={status.isFetching}
        failed={status.isError}
      />
      <RegistrationKeyCard
        status={status.isError ? undefined : status.data}
        loading={status.isFetching}
        pending={pending}
        error={errorMessage(manage.error, status.error) || confirmationError}
        value={value}
        password={password}
        copyNotice={copyNotice}
        onPasswordChange={setPassword}
        onCopy={() => {
          void copy();
        }}
        onGenerate={() => change({ type: 'generate' })}
        onRevoke={() => {
          if (status.data?.key) change({ type: 'revoke', id: status.data.key.id });
        }}
        onRefresh={() => {
          clear();
          manage.reset();
          confirm.reset();
          setConfirmationError('');
          void status.refetch();
        }}
        onConfirm={() => {
          if (pending) return;
          clear();
          setConfirmationError('');
          confirm.mutate(password, {
            onError: (error) => setConfirmationError(error.message),
            onSettled: () => {
              setPassword('');
              confirm.reset();
            },
          });
        }}
      />
    </>
  );
}

function visibleKey(
  status: RegistrationKeyStatus | undefined,
  shown: { id: string; value: string } | null,
) {
  if (status?.key?.status !== 'active' || status.key.id !== shown?.id) return undefined;
  return shown.value;
}
function errorMessage(...errors: (Error | null)[]) {
  return errors.find((error) => error !== null)?.message;
}

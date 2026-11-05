import { useState } from 'react';
import type { ChildAccess } from '@education/contracts';
import { ChildAccessCard } from '../components/ChildAccessCard';
import { useFamilyChildren, useResetChildAccess } from '../data-access/useChildAccess';
import { useParentReauthentication } from '../data-access/useParentReauthentication';

export function ChildAccessPanel({ csrf }: { csrf: string }) {
  const status = useFamilyChildren(csrf),
    reset = useResetChildAccess(csrf),
    confirm = useParentReauthentication(csrf);
  const [selected, select] = useState<ChildAccess>();
  const [pin, setPin] = useState(''),
    [confirmation, setConfirmation] = useState(''),
    [password, setPassword] = useState('');
  const [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const pending = reset.isPending || confirm.isPending;
  const clear = () => {
    select(undefined);
    setPin('');
    setConfirmation('');
  };
  const submit = () => {
    if (pending || !selected) return;
    setError('');
    setNotice('');
    if (pin !== confirmation) {
      setError('两次 PIN 不一致，请再检查一下。');
      return;
    }
    reset.mutate(
      { childId: selected.id, credentialVersion: selected.credentialVersion, pin },
      {
        onSuccess: () =>
          setNotice(`已重置${selected.nickname}的 PIN，旧登录已退出。请把新 PIN 告诉孩子。`),
        onError: (e) => setError(e.message),
        onSettled: () => {
          clear();
          reset.reset();
        },
      },
    );
  };
  return (
    <ChildAccessCard
      status={status.isError ? undefined : status.data}
      loading={status.isFetching}
      pending={pending}
      selected={selected}
      pin={pin}
      confirmation={confirmation}
      password={password}
      error={error || status.error?.message}
      notice={notice}
      onSelect={(child) => {
        clear();
        select(child);
        setError('');
        setNotice('');
      }}
      onPin={setPin}
      onConfirmation={setConfirmation}
      onPassword={setPassword}
      onSubmit={submit}
      onCancel={clear}
      onRefresh={() => {
        clear();
        setPassword('');
        setError('');
        setNotice('');
        void status.refetch();
      }}
      onConfirm={() => {
        if (pending) return;
        setError('');
        confirm.mutate(password, {
          onError: (e) => setError(e.message),
          onSettled: () => {
            setPassword('');
            confirm.reset();
          },
        });
      }}
    />
  );
}

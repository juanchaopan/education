import { useState } from 'react';
import { FamilyCodeCard } from '../components/FamilyCodeCard';
import { FamilyCodeChip, type FamilyCodeChipProps } from '../components/FamilyCodeChip';
import { useRegistrationKey } from '../data-access/useRegistrationKey';

// Copies the family code. A browser that will not copy for the page leaves the
// parent to select the code by hand, and says so.
function useCopyCode(code: string | undefined) {
  const [notice, setNotice] = useState('');
  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setNotice('已复制家庭码。');
    } catch {
      setNotice('暂时无法自动复制，请长按或选中家庭码复制。');
    }
  };
  return {
    notice,
    onCopy: () => {
      void copy();
    },
  };
}

// The family code chip with its copy, at the top of the overview.
export function FamilyCodePanel(props: Omit<FamilyCodeChipProps, 'onCopy' | 'notice'>) {
  return <FamilyCodeChip {...props} {...useCopyCode(props.code)} />;
}

// The family code card on the 「家庭」 page, read with the family's KEY status.
export function FamilyCodeCardPanel({ csrf }: { csrf: string }) {
  const status = useRegistrationKey(csrf);
  const code = status.isSuccess ? status.data.familyCode : undefined;
  return (
    <FamilyCodeCard
      key={code}
      code={code}
      loading={status.isPending}
      failed={status.isError}
      {...useCopyCode(code)}
    />
  );
}

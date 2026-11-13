import { useState } from 'react';
import { FamilyCodeCard } from '../components/FamilyCodeCard';
import { FamilyCodeChip, type FamilyCodeChipProps } from '../components/FamilyCodeChip';
import { useRegistrationKey } from '../data-access/useRegistrationKey';

// Copies the family code. A browser that will not copy for the page leaves the
// parent to select the code by hand, and says so. What the last copy said
// belongs to the code it copied, so a code that changes shows without it.
function useCopyCode(code: string | undefined) {
  const [copied, setCopied] = useState<{ code: string; notice: string }>();
  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied({ code, notice: '已复制家庭码。' });
    } catch {
      setCopied({ code, notice: '暂时无法自动复制，请长按或选中家庭码复制。' });
    }
  };
  return {
    notice: copied && copied.code === code ? copied.notice : '',
    onCopy: () => {
      void copy();
    },
  };
}

// The family code chip with its copy, at the top of the overview.
export function FamilyCodePanel(props: Omit<FamilyCodeChipProps, 'onCopy' | 'notice'>) {
  const copying = useCopyCode(props.code);
  return <FamilyCodeChip {...props} {...copying} />;
}

// The family code card on the 「家庭」 page, read with the family's KEY status.
export function FamilyCodeCardPanel({ csrf }: { csrf: string }) {
  const status = useRegistrationKey(csrf);
  const code = status.isSuccess ? status.data.familyCode : undefined;
  const copying = useCopyCode(code);
  return (
    <FamilyCodeCard code={code} loading={status.isPending} failed={status.isError} {...copying} />
  );
}

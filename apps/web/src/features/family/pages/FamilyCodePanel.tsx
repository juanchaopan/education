import { useState } from 'react';
import { FamilyCodeChip, type FamilyCodeChipProps } from '../components/FamilyCodeChip';

// The family code chip with its copy. A browser that will not copy for the
// page leaves the parent to select the code by hand, and says so.
export function FamilyCodePanel(props: Omit<FamilyCodeChipProps, 'onCopy' | 'notice'>) {
  const [notice, setNotice] = useState('');
  const copy = async () => {
    if (!props.code) return;
    try {
      await navigator.clipboard.writeText(props.code);
      setNotice('已复制家庭码。');
    } catch {
      setNotice('暂时无法自动复制，请长按或选中家庭码复制。');
    }
  };
  return (
    <FamilyCodeChip
      {...props}
      notice={notice}
      onCopy={() => {
        void copy();
      }}
    />
  );
}

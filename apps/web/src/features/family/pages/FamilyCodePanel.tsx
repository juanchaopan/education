import { useState } from 'react';
import { FamilyCodeCard, type FamilyCodeCardProps } from '../components/FamilyCodeCard';
export function FamilyCodePanel(props: Omit<FamilyCodeCardProps, 'onCopy' | 'notice'>) {
  const [notice, setNotice] = useState('');
  const copy = async () => {
    if (!props.code) return;
    try {
      await navigator.clipboard.writeText(props.code);
      setNotice('已复制家庭码。');
    } catch {
      setNotice('暂时无法自动复制，请长按或选中上面的家庭码复制。');
    }
  };
  return (
    <FamilyCodeCard
      {...props}
      notice={notice}
      onCopy={() => {
        void copy();
      }}
    />
  );
}

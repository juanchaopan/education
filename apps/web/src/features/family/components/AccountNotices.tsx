import { Notice } from '../../../shared/ui/Notice';

type Props = {
  // The signed-in session could not be read again just now.
  refreshing?: boolean;
  // Signing out did not go through.
  error?: string;
};

// What can go wrong with the parent's own account while signed in.
export function AccountNotices({ refreshing, error }: Props) {
  return (
    <>
      {refreshing && <Notice>暂时无法刷新账号状态，请稍后重试。</Notice>}
      {error && <Notice tone="error">{error}</Notice>}
    </>
  );
}

import type { ParentSession } from '@education/contracts';
import { Button } from '../../../shared/ui/Button';
import { Card } from '../../../shared/ui/Card';
import { AccountNotices } from './AccountNotices';
import { ParentAddress } from './ParentAddress';

export type AccountStatusProps = {
  session: ParentSession;
  pending?: boolean;
  error?: string;
  refreshing?: boolean;
  onLogout: () => void;
};

// The verified parent's account at the top of the parent space, with the way
// to sign out.
export function AccountStatus({
  session,
  pending,
  error,
  refreshing,
  onLogout,
}: AccountStatusProps) {
  return (
    <Card aria-labelledby="account-title">
      <h2 id="account-title">我的家长账号</h2>
      <ParentAddress email={session.email} verified={session.emailVerified} />
      <AccountNotices refreshing={refreshing} error={error} />
      <Button variant="secondary" onClick={onLogout} disabled={pending}>
        {pending ? '正在退出…' : '退出账号'}
      </Button>
    </Card>
  );
}

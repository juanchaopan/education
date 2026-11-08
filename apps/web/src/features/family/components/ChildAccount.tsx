import type { ChildSession } from '@education/contracts';
import { Button } from '../../../shared/ui/Button';
import { Card } from '../../../shared/ui/Card';
import { Icon } from '../../../shared/ui/Icon';

export type ChildAccountProps = {
  session: ChildSession;
  pending?: boolean;
  error?: string;
  onLogout: () => void;
};

export function ChildAccount({ session, pending, error, onLogout }: ChildAccountProps) {
  return (
    <Card aria-labelledby="child-account-title">
      <Icon name="spark" badge />
      <h2 id="child-account-title">{session.nickname}，欢迎回来！</h2>
      <p>你已登录自己的空间，下次打开通常可以直接回来。</p>
      {error && <p role="alert">{error}</p>}
      <Button disabled={pending} onClick={onLogout}>
        {pending ? '正在退出…' : '退出，换一个人'}
      </Button>
    </Card>
  );
}

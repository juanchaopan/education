import { familyDeletionScope } from '@education/contracts';
import { Button } from '../../../shared/ui/Button';
import { ScopeList } from './ScopeList';

// Shown in place of the parent space once the family is gone: what happened,
// what the deletion did not cover, and the way to start again.
export function FamilyDeleted({ onRegister }: { onRegister: () => void }) {
  return (
    <>
      <p role="status">
        这个家庭的账号和学习数据已经删除，所有设备上的家长和孩子都已退出登录。这个邮箱可以重新注册新的家庭。
      </p>
      <ScopeList title="仍然不在删除范围内" items={familyDeletionScope.remains} />
      <Button onClick={onRegister}>注册新的家庭</Button>
    </>
  );
}

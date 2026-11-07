import { familyDeletionScope } from '@education/contracts';
import { ScopeList } from './ScopeList';
import card from './RegistrationForm.module.css';

// Shown in place of the parent space once the family is gone.
export function FamilyDeleted({ onRegister }: { onRegister: () => void }) {
  return (
    <section className={card.card} aria-labelledby="family-deleted-title">
      <h2 id="family-deleted-title">家庭已删除</h2>
      <p role="status">
        这个家庭的账号和学习数据已经删除，所有设备上的家长和孩子都已退出登录。这个邮箱可以重新注册新的家庭。
      </p>
      <ScopeList title="仍然不在删除范围内" items={familyDeletionScope.remains} />
      <button type="button" onClick={onRegister}>
        注册新的家庭
      </button>
    </section>
  );
}

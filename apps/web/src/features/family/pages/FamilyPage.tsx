import { EmptyState } from '../../../shared/ui/EmptyState';

export function FamilyPage() {
  return (
    <section aria-labelledby="family-title">
      <h1 id="family-title">家长空间</h1>
      <p>陪伴每一次尝试，看见一点一滴的进步。</p>
      <EmptyState
        icon="⌂"
        title="家庭账号即将开放"
        description="开放后，您可以创建孩子的注册 KEY、安排练习，查看独立完成情况与需要帮助的地方。"
      />
    </section>
  );
}

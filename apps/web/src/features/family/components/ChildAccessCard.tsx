import type { ChildAccess, FamilyChildren } from '@education/contracts';
import { ChildPinResetForm } from './ChildPinResetForm';
import { ParentPasswordForm } from './ParentPasswordForm';
import styles from './RegistrationForm.module.css';
import panel from './RegistrationKeyCard.module.css';

export type ChildAccessCardProps = {
  status?: FamilyChildren;
  loading: boolean;
  pending: boolean;
  error?: string;
  notice?: string;
  selected?: ChildAccess;
  pin: string;
  confirmation: string;
  password: string;
  onSelect: (child: ChildAccess) => void;
  onPin: (pin: string) => void;
  onConfirmation: (pin: string) => void;
  onPassword: (password: string) => void;
  onConfirm: () => void;
  onSubmit: () => void;
  onCancel: () => void;
  onRefresh: () => void;
};
export function ChildAccessCard(props: ChildAccessCardProps) {
  const { loading, pending } = props;
  return (
    <section className={`${styles.card} ${panel.panel}`} aria-labelledby="child-access-title">
      <h2 id="child-access-title">孩子登录管理</h2>
      <p>孩子忘记 PIN 或需要退出旧设备时，可以在这里重新设置。</p>
      {loading && <p role="status">正在确认孩子状态…</p>}
      <AccessContent {...props} />
      {props.error && (
        <p role="alert" className={styles.notice}>
          {props.error}
        </p>
      )}
      {props.notice && (
        <p role="status" className={styles.notice}>
          {props.notice}
        </p>
      )}
      <div className={panel.actions}>
        <button type="button" disabled={loading || pending} onClick={props.onRefresh}>
          刷新孩子状态
        </button>
      </div>
    </section>
  );
}

function AccessContent(props: ChildAccessCardProps) {
  const { status, loading, pending, selected } = props;
  if (!status || loading) return null;
  if (!status.children.length)
    return <p role="status">还没有关联的孩子。先生成注册 KEY，再让孩子完成注册。</p>;
  if (status.reauthenticationRequired)
    return (
      <>
        <ParentPasswordForm
          id="reset-parent-password"
          label="重置 PIN 前确认家长密码"
          purpose="重置孩子 PIN"
          password={props.password}
          pending={pending}
          onChange={props.onPassword}
          onSubmit={props.onConfirm}
        />
        <ChildChoices {...props} disabled />
      </>
    );
  if (selected)
    return (
      <ChildPinResetForm
        child={selected}
        pin={props.pin}
        confirmation={props.confirmation}
        pending={pending}
        onPin={props.onPin}
        onConfirmation={props.onConfirmation}
        onSubmit={props.onSubmit}
        onCancel={props.onCancel}
      />
    );
  return <ChildChoices {...props} disabled={pending} />;
}
function ChildChoices(props: ChildAccessCardProps & { disabled: boolean }) {
  return (
    <ul>
      {props.status?.children.map((child) => (
        <li key={child.id}>
          <p>{child.nickname}</p>
          <button type="button" disabled={props.disabled} onClick={() => props.onSelect(child)}>
            为{child.nickname}重置 PIN
          </button>
        </li>
      ))}
    </ul>
  );
}

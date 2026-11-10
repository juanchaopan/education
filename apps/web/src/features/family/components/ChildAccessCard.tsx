import type { ChildAccess, FamilyChildren } from '@education/contracts';
import { Avatar } from '../../../shared/ui/Avatar';
import { Button } from '../../../shared/ui/Button';
import { Icon } from '../../../shared/ui/Icon';
import { Loading } from '../../../shared/ui/Loading';
import { Notice } from '../../../shared/ui/Notice';
import { ChildPinResetForm } from './ChildPinResetForm';
import { ParentCard } from './ParentCard';
import { ParentPasswordForm } from './ParentPasswordForm';
import styles from './ChildAccessCard.module.css';

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

// The family's children, each with the way to give them a new PIN. Resetting
// is a second step that says what it signs out before it is confirmed.
export function ChildAccessCard(props: ChildAccessCardProps) {
  const { loading, pending } = props;
  return (
    <ParentCard
      titleId="child-access-title"
      icon="users"
      title="孩子登录管理"
      action={
        <Button variant="text" disabled={loading || pending} onClick={props.onRefresh}>
          刷新孩子状态
        </Button>
      }
    >
      {loading && <Loading label="正在确认孩子状态…" />}
      <AccessContent {...props} />
      {props.error && <Notice tone="error">{props.error}</Notice>}
      {props.notice && <Notice tone="success">{props.notice}</Notice>}
    </ParentCard>
  );
}

function AccessContent(props: ChildAccessCardProps) {
  const { status, loading, pending, selected } = props;
  if (!status || loading) return null;
  if (!status.children.length)
    return <p role="status">还没有关联的孩子。生成注册 KEY，邀请孩子加入家庭。</p>;
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
        <ChildRows {...props} disabled />
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
  return <ChildRows {...props} disabled={pending} />;
}

function ChildRows(props: ChildAccessCardProps & { disabled: boolean }) {
  return (
    <ul className={styles.children}>
      {props.status?.children.map((child, place) => (
        <li key={child.id} className={styles.child}>
          <Avatar name={child.nickname} place={place} />
          <span className={styles.nickname}>{child.nickname}</span>
          <Button
            variant="secondary"
            aria-label={`为${child.nickname}重置 PIN`}
            disabled={props.disabled}
            onClick={() => props.onSelect(child)}
          >
            <Icon name="lock" />
            重置 PIN
          </Button>
        </li>
      ))}
    </ul>
  );
}

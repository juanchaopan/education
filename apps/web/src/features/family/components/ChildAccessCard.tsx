import type { ChildAccess, FamilyChildren } from '@education/contracts';
import { Actions } from '../../../shared/ui/Actions';
import { Button } from '../../../shared/ui/Button';
import { Loading } from '../../../shared/ui/Loading';
import { Notice } from '../../../shared/ui/Notice';
import { ChildPinResetForm } from './ChildPinResetForm';
import { Panel } from './Panel';
import { ParentPasswordForm } from './ParentPasswordForm';

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
    <Panel titleId="child-access-title" title="孩子登录管理">
      <p>孩子忘记 PIN 或需要退出旧设备时，可以在这里重新设置。</p>
      {loading && <Loading label="正在确认孩子状态…" />}
      <AccessContent {...props} />
      {props.error && <Notice tone="error">{props.error}</Notice>}
      {props.notice && <Notice tone="success">{props.notice}</Notice>}
      <Actions>
        <Button disabled={loading || pending} onClick={props.onRefresh}>
          刷新孩子状态
        </Button>
      </Actions>
    </Panel>
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
          <Button disabled={props.disabled} onClick={() => props.onSelect(child)}>
            为{child.nickname}重置 PIN
          </Button>
        </li>
      ))}
    </ul>
  );
}

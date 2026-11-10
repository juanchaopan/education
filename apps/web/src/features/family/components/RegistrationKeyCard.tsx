import type { RegistrationKeyInfo, RegistrationKeyStatus } from '@education/contracts';
import { Actions } from '../../../shared/ui/Actions';
import { Button } from '../../../shared/ui/Button';
import { Hint } from '../../../shared/ui/Hint';
import { IconButton } from '../../../shared/ui/IconButton';
import { Loading } from '../../../shared/ui/Loading';
import { Notice } from '../../../shared/ui/Notice';
import { ParentCard } from './ParentCard';
import { ParentPasswordForm } from './ParentPasswordForm';
import { StatusBadge } from './StatusBadge';
import styles from './RegistrationKeyCard.module.css';

export type RegistrationKeyCardProps = {
  status?: RegistrationKeyStatus;
  loading?: boolean;
  pending?: boolean;
  error?: string;
  value?: string;
  password: string;
  copyNotice?: string;
  onPasswordChange: (value: string) => void;
  onConfirm: () => void;
  onGenerate: () => void;
  onRevoke: () => void;
  onRefresh: () => void;
  onCopy: () => void;
};

const labels = { active: '待使用', expired: '已过期', revoked: '已撤销', used: '已使用' };

// Where the family's KEY stands: a badge for its state and, while it can
// still be used, until when. Only a KEY a child can still use reads as
// settled; any other leaves the parent to make a new one when needed.
function KeyState({ info }: { info: RegistrationKeyInfo | null }) {
  if (!info) return <p role="status">还没有注册 KEY</p>;
  const active = info.status === 'active';
  return (
    <p className={styles.state}>
      <StatusBadge tone={active ? 'ok' : 'wait'} live>
        {labels[info.status]}
      </StatusBadge>
      {active && (
        <span>
          有效期至{' '}
          <time dateTime={info.expiresAt}>{new Date(info.expiresAt).toLocaleString('zh-CN')}</time>
        </span>
      )}
    </p>
  );
}

// The secret is shown once, right after it is made, large enough to read out
// to a child, with what the parent must know before the page is left.
function KeySecret({ value, pending, copyNotice, onCopy }: RegistrationKeyCardProps) {
  if (!value) return null;
  return (
    <div className={styles.secret}>
      <p className={styles.value}>
        <output aria-label="本次生成的注册 KEY">{value}</output>
        <IconButton icon="copy" label="复制注册 KEY" onClick={onCopy} disabled={pending} />
      </p>
      <p>KEY 原文只在这次生成后显示，请及时复制。刷新后无法再次查看。</p>
      <p>孩子打开「孩子注册」，填这个 KEY 加入家庭。</p>
      {copyNotice && <p role="status">{copyNotice}</p>}
    </div>
  );
}

// Making a KEY, or a new one in place of an active one, withdrawing an active
// one, and reading its state again. Changing the KEY waits for the parent's
// password when the server asks for it.
function KeyActions(props: RegistrationKeyCardProps) {
  const { status, loading, pending } = props;
  const active = status?.key?.status === 'active';
  const disabled = pending || loading || !status || status.reauthenticationRequired;
  return (
    <Actions>
      <Button disabled={disabled} onClick={props.onGenerate}>
        {active ? '重新生成注册 KEY' : '生成注册 KEY'}
      </Button>
      {active && (
        <Button variant="secondary" disabled={disabled} onClick={props.onRevoke}>
          撤销注册 KEY
        </Button>
      )}
      <Button variant="text" disabled={pending || loading} onClick={props.onRefresh}>
        刷新 KEY 状态
      </Button>
    </Actions>
  );
}

// Inviting a child: one KEY at a time, which a child uses once to join the
// family. What a new KEY does to the old one is said beside the buttons.
export function RegistrationKeyCard(props: RegistrationKeyCardProps) {
  const { status, loading, pending, error } = props;
  return (
    <ParentCard titleId="registration-key-title" icon="key" title="孩子注册 KEY">
      {loading && <Loading label="正在确认 KEY 状态…" />}
      {status && <KeyState info={status.key} />}
      <KeySecret {...props} />
      {status?.reauthenticationRequired && (
        <ParentPasswordForm
          password={props.password}
          pending={pending}
          onChange={props.onPasswordChange}
          onSubmit={props.onConfirm}
        />
      )}
      {error && <Notice tone="error">{error}</Notice>}
      <KeyActions {...props} />
      <Hint>KEY 24 小时内有效、只能用一次；重新生成会撤销旧 KEY，已注册的孩子不受影响。</Hint>
    </ParentCard>
  );
}

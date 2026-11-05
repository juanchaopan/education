import type { RegistrationKeyStatus, RegistrationKeyInfo } from '@education/contracts';
import { ParentPasswordForm } from './ParentPasswordForm';
import styles from './RegistrationForm.module.css';
import keyStyles from './RegistrationKeyCard.module.css';
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
function KeyDetails({ info }: { info?: RegistrationKeyInfo | null }) {
  if (!info) return <p role="status">还没有注册 KEY</p>;
  return (
    <>
      <p role="status">{labels[info.status]}</p>
      <p>
        有效期至：
        <time dateTime={info.expiresAt}>{new Date(info.expiresAt).toLocaleString('zh-CN')}</time>
      </p>
      {info.status === 'active' && (
        <p className={styles.hint}>重新生成会撤销旧 KEY；已注册孩子不受影响。</p>
      )}
    </>
  );
}
function KeySecret({ value, pending, copyNotice, onCopy }: RegistrationKeyCardProps) {
  if (!value) return null;
  return (
    <div className={styles.notice}>
      <p>KEY 原文只在这次生成后显示，请及时复制。刷新后无法再次查看。</p>
      <p>
        <output aria-label="本次生成的注册 KEY">{value}</output>
      </p>
      <button type="button" onClick={onCopy} disabled={pending}>
        复制注册 KEY
      </button>
      {copyNotice && <p role="status">{copyNotice}</p>}
    </div>
  );
}
function managementDisabled({ pending, loading, status }: RegistrationKeyCardProps) {
  return pending || loading || !status || status.reauthenticationRequired;
}
export function RegistrationKeyCard(props: RegistrationKeyCardProps) {
  const { status, loading, pending, error } = props;
  const active = isActive(status);
  const disabled = managementDisabled(props);
  return (
    <section
      className={`${styles.card} ${keyStyles.panel}`}
      aria-labelledby="registration-key-title"
    >
      <h2 id="registration-key-title">孩子注册 KEY</h2>
      <p>把 KEY 交给孩子，用于首次注册并加入家庭。之后用家庭码、昵称和六位 PIN 登录。</p>
      <p className={styles.hint}>KEY 24 小时内有效，只能使用一次；到期不会影响孩子的账号或进度。</p>
      {loading && <p role="status">正在确认 KEY 状态…</p>}
      {status && <KeyDetails info={status.key} />}
      <KeySecret {...props} />
      {status?.reauthenticationRequired && (
        <ParentPasswordForm
          password={props.password}
          pending={pending}
          onChange={props.onPasswordChange}
          onSubmit={props.onConfirm}
        />
      )}
      {error && (
        <p role="alert" className={styles.notice}>
          {error}
        </p>
      )}
      <div className={keyStyles.actions}>
        <button type="button" disabled={disabled} onClick={props.onGenerate}>
          {active ? '重新生成注册 KEY' : '生成注册 KEY'}
        </button>
        {active && (
          <button type="button" disabled={disabled} onClick={props.onRevoke}>
            撤销注册 KEY
          </button>
        )}{' '}
        <button type="button" disabled={pending || loading} onClick={props.onRefresh}>
          刷新 KEY 状态
        </button>
      </div>
      <p className={styles.hint}>孩子填写 KEY 的注册页面将在下一项功能开放。</p>
    </section>
  );
}

function isActive(status: RegistrationKeyStatus | undefined) {
  return status?.key?.status === 'active';
}

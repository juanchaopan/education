import notice from './VerificationNotice.module.css';
import type { VerificationStatus, VerificationAction } from '@education/contracts';
import styles from './RegistrationForm.module.css';

export type VerificationNoticeProps = {
  status?: VerificationStatus;
  loading?: boolean;
  pending?: boolean;
  error?: string;
  onSend: (action: VerificationAction['action']) => void;
  onRefresh: () => void;
};
const notices = {
  'not-sent': '还未发送验证邮件。请点击下面的按钮，邮件只会发往您的家长邮箱。',
  sending: '正在处理邮件。请稍后刷新发送状态，不要连续点击发送。',
  accepted: '邮件服务商已接受请求。请查看收件箱和垃圾箱；这不代表邮件已送达或邮箱已验证。',
  retryable: '邮件暂未被接受。稍等后可以安全重试，重试仍使用同一条有效链接。',
  rejected: '邮件服务商拒绝了这次发送。请稍后再试；持续失败时请联系网站维护者。',
  'authorization-failed': '网站发信授权暂时不可用。请等待维护者恢复后再试。',
  unknown: '无法确定邮件是否已发送。请先查看收件箱和垃圾箱；重新发送会让旧链接失效。',
  expired: '验证链接已过期。请重新发送一封验证邮件。',
  verified: '邮箱已验证。请退出后重新登录，以获得已验证账号权限。',
};
export function VerificationNotice(props: VerificationNoticeProps) {
  return (
    <section className={`${styles.card} ${notice.panel}`} aria-labelledby="verification-title">
      <h2 id="verification-title">验证家长邮箱</h2>
      {props.loading && <p role="status">正在查看发送状态…</p>}
      {props.status && <VerificationContent {...props} status={props.status} />}
      {props.error && (
        <p role="alert" className={styles.notice}>
          {props.error}
        </p>
      )}
      <button type="button" disabled={props.pending || props.loading} onClick={props.onRefresh}>
        刷新发送状态
      </button>
    </section>
  );
}
function VerificationContent({
  status,
  pending,
  onSend,
}: VerificationNoticeProps & { status: VerificationStatus }) {
  if (!status.enabled) return <p role="status">验证邮件服务尚未开放，请稍后再来。</p>;
  const disabled = !!pending || status.status === 'sending' || status.retryAfter > 0;
  return (
    <>
      <p role="status">{notices[status.status]}</p>
      {status.status !== 'verified' && (
        <>
          <p>链接 24 小时有效。打开邮件链接后，请在页面中主动确认验证。</p>
          {status.retryAfter > 0 && (
            <p>还需等待约 {status.retryAfter} 秒；稍后点击“刷新发送状态”。</p>
          )}
          {status.canRetry && (
            <button type="button" disabled={disabled} onClick={() => onSend('retry')}>
              安全重试这次发送
            </button>
          )}
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSend(status.status === 'not-sent' ? 'send' : 'resend')}
          >
            {pending
              ? '正在发送…'
              : status.status === 'not-sent'
                ? '发送验证邮件'
                : '重新发送（旧链接失效）'}
          </button>
        </>
      )}
    </>
  );
}

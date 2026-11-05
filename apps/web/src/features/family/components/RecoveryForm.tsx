import type { FormEvent } from 'react';
import type { RecoveryRequest } from '@education/contracts';
import styles from './RegistrationForm.module.css';
export type RecoveryFormProps = {
  email: string;
  pending?: boolean;
  received?: boolean;
  error?: string;
  onEmailChange: (email: string) => void;
  onSubmit: (action: RecoveryRequest['action']) => void;
};
export function RecoveryForm(props: RecoveryFormProps) {
  const submit = (event: FormEvent) => {
    event.preventDefault();
    props.onSubmit('send');
  };
  return (
    <section className={styles.card} aria-labelledby="recovery-title">
      <h1 id="recovery-title">找回家长密码</h1>
      <p>填写注册邮箱。我们会通过邮件帮助您设置新密码，不会删除账号或学习进度。</p>
      <form onSubmit={submit} aria-busy={props.pending}>
        <label htmlFor="recovery-email">注册邮箱</label>
        <input
          id="recovery-email"
          name="username"
          type="email"
          autoComplete="username"
          required
          maxLength={254}
          value={props.email}
          disabled={props.pending}
          onChange={(e) => props.onEmailChange(e.target.value)}
        />
        <button type="submit" disabled={props.pending}>
          {props.pending ? '正在受理，请稍等…' : '发送恢复邮件'}
        </button>
        <p className={styles.hint}>为保护账号隐私，受理通常需要约 20 秒。请勿反复点击。</p>
        {props.pending && <p role="status">请稍等，正在处理恢复申请。</p>}
        {props.received && (
          <div role="status" className={styles.notice}>
            <p>
              恢复申请已受理。如果该邮箱已注册且未超过发送限额，您会收到邮件。请检查收件箱和垃圾箱。
            </p>
            <p>链接 30 分钟有效。未收到时，至少等 60 秒再试；达到每日上限时，请明天再来。</p>
          </div>
        )}
        {props.received && (
          <>
            <button type="button" disabled={props.pending} onClick={() => props.onSubmit('retry')}>
              重试同一封邮件
            </button>
            <p className={styles.hint}>
              只会重试服务商明确暂时拒绝的邮件，最多三次；不确定是否送达时不会重复投递。
            </p>
            <button type="button" disabled={props.pending} onClick={() => props.onSubmit('resend')}>
              重新发送（旧链接失效）
            </button>
          </>
        )}
        {props.error && (
          <p role="alert" className={styles.notice}>
            {props.error}
          </p>
        )}
      </form>
    </section>
  );
}

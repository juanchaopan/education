import type { FormEvent } from 'react';
import styles from './RegistrationForm.module.css';
export type PasswordResetFormProps = {
  password: string;
  confirmation: string;
  pending?: boolean;
  error?: string;
  onPasswordChange: (password: string) => void;
  onConfirmationChange: (confirmation: string) => void;
  onSubmit: () => void;
};
export function PasswordResetForm(props: PasswordResetFormProps) {
  const submit = (event: FormEvent) => {
    event.preventDefault();
    props.onSubmit();
  };
  return (
    <section className={styles.card} aria-labelledby="reset-title">
      <h1 id="reset-title">设置新的家长密码</h1>
      <p>提交后，家庭的旧登录状态和未使用注册 KEY 会失效。账号、家庭关联和学习进度会保留。</p>
      <form onSubmit={submit} aria-busy={props.pending}>
        <label htmlFor="reset-password">新密码</label>
        <input
          id="reset-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={15}
          maxLength={128}
          value={props.password}
          disabled={props.pending}
          onChange={(e) => props.onPasswordChange(e.target.value)}
        />
        <p className={styles.hint}>15–128 个字符，最多 512 字节。可以使用空格或一句好记的话。</p>
        <label htmlFor="reset-confirmation">再次输入新密码</label>
        <input
          id="reset-confirmation"
          name="confirmation"
          type="password"
          autoComplete="new-password"
          required
          minLength={15}
          maxLength={128}
          value={props.confirmation}
          disabled={props.pending}
          onChange={(e) => props.onConfirmationChange(e.target.value)}
        />
        {props.error && (
          <p role="alert" className={styles.notice}>
            {props.error}
          </p>
        )}
        <button type="submit" disabled={props.pending}>
          {props.pending ? '正在保存，请稍等…' : '确认设置新密码'}
        </button>
      </form>
    </section>
  );
}

import type { FormEvent } from 'react';
import styles from './RegistrationForm.module.css';
export type LoginFormProps = {
  email: string;
  password: string;
  pending?: boolean;
  error?: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
};
export function LoginForm(props: LoginFormProps) {
  const submit = (event: FormEvent) => {
    event.preventDefault();
    props.onSubmit();
  };
  return (
    <div className={styles.layout}>
      <aside className={styles.introduction}>
        <h2>欢迎回来，继续陪伴探索</h2>
        <p>可使用浏览器的密码管理器记住密码。网站不会保存您的明文密码。</p>
        <p>公共设备使用结束后，请退出账号。</p>
      </aside>
      <section className={styles.card} aria-labelledby="login-title">
        <h2 id="login-title">家长登录</h2>
        <form onSubmit={submit} aria-busy={props.pending}>
          <label htmlFor="login-email">登录邮箱</label>
          <input
            id="login-email"
            name="username"
            type="email"
            autoComplete="username"
            required
            maxLength={254}
            value={props.email}
            disabled={props.pending}
            onChange={(event) => props.onEmailChange(event.target.value)}
          />
          <label htmlFor="login-password">登录密码</label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={props.password}
            disabled={props.pending}
            onChange={(event) => props.onPasswordChange(event.target.value)}
          />
          {props.error && (
            <p role="alert" className={styles.notice}>
              {props.error}
            </p>
          )}
          <button type="submit" disabled={props.pending}>
            {props.pending ? '正在登录，请稍等…' : '登录'}
          </button>
          <p className={styles.hint}>账号和学习进度不会因登录状态到期而删除。</p>
        </form>
      </section>
    </div>
  );
}

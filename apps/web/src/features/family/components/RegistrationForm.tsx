import type { FormEvent } from 'react';
import styles from './RegistrationForm.module.css';

export type RegistrationFormProps = {
  email: string;
  password: string;
  pending?: boolean;
  available?: boolean;
  notice?: string;
  error?: string;
  submitted?: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
};

export function RegistrationForm(props: RegistrationFormProps) {
  const submit = (event: FormEvent) => {
    event.preventDefault();
    props.onSubmit();
  };
  return (
    <div className={styles.layout}>
      <aside className={styles.introduction}>
        <span className={styles.symbol} aria-hidden="true">
          ⌂
        </span>
        <h2>陪伴探索，从这里开始</h2>
        <p>先为自己创建家长账号。之后，孩子可以用您的注册 KEY 加入家庭。</p>
        <p>慢慢来，和孩子一起看见每一步进步。</p>
      </aside>
      <section className={styles.card} aria-labelledby="registration-title">
        <h2 id="registration-title">创建家长账号</h2>
        <p className={styles.hint}>请使用您自己的邮箱，不需要填写孩子的信息。</p>
        {props.submitted ? (
          <div role="status" className={styles.notice}>
            <h3>注册申请已受理</h3>
            <p>若此邮箱尚未注册，待验证账号已保存。重复提交不会创建另一个家庭。</p>
            <p>尚未发送验证邮件。请点击“已有账号？去登录”，登录后发送验证邮件并完成验证。</p>
          </div>
        ) : (
          <form onSubmit={submit} aria-busy={props.pending}>
            <label htmlFor="parent-email">家长邮箱</label>
            <input
              id="parent-email"
              name="email"
              type="email"
              autoComplete="username"
              required
              maxLength={254}
              value={props.email}
              disabled={props.pending}
              onChange={(event) => props.onEmailChange(event.target.value)}
            />
            <label htmlFor="parent-password">设置密码</label>
            <input
              id="parent-password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              aria-describedby="password-help"
              value={props.password}
              disabled={props.pending}
              onChange={(event) => props.onPasswordChange(event.target.value)}
            />
            <p id="password-help" className={styles.hint}>
              15–128 个字符。可以用一句好记的话，也可以粘贴密码管理器生成的密码。
            </p>
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
            <button type="submit" disabled={props.pending || !props.available}>
              {props.pending ? '正在保存，请稍等…' : '提交注册'}
            </button>
            <p className={styles.hint}>家长验证邮箱并登录后，可以生成 KEY，邀请孩子加入家庭。</p>
          </form>
        )}
      </section>
    </div>
  );
}

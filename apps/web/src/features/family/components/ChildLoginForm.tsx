import type { FormEvent } from 'react';
import styles from './RegistrationForm.module.css';
import childStyles from './ChildLoginForm.module.css';
export type ChildLoginFields = { familyCode: string; nickname: string; pin: string };
export type ChildLoginFormProps = ChildLoginFields & {
  remember: boolean;
  pending?: boolean;
  error?: string;
  onChange: (field: keyof ChildLoginFields, value: string) => void;
  onRemember: (value: boolean) => void;
  onSubmit: () => void;
};
export function ChildLoginForm(props: ChildLoginFormProps) {
  const submit = (event: FormEvent) => {
    event.preventDefault();
    props.onSubmit();
  };
  return (
    <div className={styles.layout}>
      <aside className={styles.introduction}>
        <span className={styles.symbol} aria-hidden="true">
          ✳
        </span>
        <h2>欢迎回来，小小探索家</h2>
        <p>慢慢来，请输入自己的六位 PIN。</p>
        <p>第一次来这台设备？请家长从家长空间复制家庭码，再填上注册时的昵称。</p>
        <p>登录后，下次打开通常可以直接回来。共用设备时，离开前记得退出。</p>
      </aside>
      <section className={styles.card} aria-labelledby="child-login-title">
        <h2 id="child-login-title">孩子登录</h2>
        <form onSubmit={submit} aria-busy={props.pending}>
          <label htmlFor="child-family">我的家庭码</label>
          <input
            id="child-family"
            name="family-code"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            required
            maxLength={32}
            value={props.familyCode}
            disabled={props.pending}
            onChange={(e) => props.onChange('familyCode', e.target.value)}
            aria-describedby="family-help"
          />
          <p id="family-help" className={styles.hint}>
            家长空间里随时可查看，不用背下来。不是注册 KEY。
          </p>
          <label htmlFor="child-nickname">我的昵称</label>
          <input
            id="child-nickname"
            name="username"
            autoComplete="username"
            required
            maxLength={64}
            value={props.nickname}
            disabled={props.pending}
            onChange={(e) => props.onChange('nickname', e.target.value)}
          />
          <label htmlFor="child-pin">我的六位 PIN</label>
          <input
            id="child-pin"
            name="password"
            type="password"
            autoComplete="current-password"
            inputMode="numeric"
            pattern="[0-9]{6}"
            minLength={6}
            maxLength={6}
            required
            value={props.pin}
            disabled={props.pending}
            onChange={(e) => props.onChange('pin', e.target.value)}
          />
          <label className={childStyles.remember}>
            <input
              type="checkbox"
              checked={props.remember}
              disabled={props.pending}
              onChange={(e) => props.onRemember(e.target.checked)}
            />
            在这台设备上记住家庭码和昵称
          </label>
          <p className={styles.hint}>网站不会记住明文 PIN。共用设备可取消勾选。</p>
          {props.error && (
            <p role="alert" className={styles.notice}>
              {props.error}
            </p>
          )}
          <button type="submit" disabled={props.pending}>
            {props.pending ? '正在打开你的空间…' : '进入我的空间'}
          </button>
        </form>
      </section>
    </div>
  );
}

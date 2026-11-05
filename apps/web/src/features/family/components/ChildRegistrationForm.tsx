import type { FormEvent } from 'react';
import styles from './RegistrationForm.module.css';

export type ChildRegistrationFormProps = {
  registrationKey: string;
  nickname: string;
  pin: string;
  pending?: boolean;
  error?: string;
  onChange: (field: 'registrationKey' | 'nickname' | 'pin', value: string) => void;
  onSubmit: () => void;
};
export function ChildRegistrationForm(props: ChildRegistrationFormProps) {
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
        <h2>我们一起，迈出第一步</h2>
        <p>请家长把注册 KEY 给你。它像一张邀请卡，帮助你加入自己的家庭。</p>
        <p>慢慢填就好。遇到困难，可以请家长陪你一起完成。</p>
      </aside>
      <section className={styles.card} aria-labelledby="child-form-title">
        <h2 id="child-form-title">加入我的家庭</h2>
        <form onSubmit={submit} aria-busy={props.pending}>
          <label htmlFor="child-key">家长给我的 KEY</label>
          <input
            id="child-key"
            name="registration-key"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={32}
            required
            value={props.registrationKey}
            disabled={props.pending}
            onChange={(e) => props.onChange('registrationKey', e.target.value)}
            aria-describedby="child-key-help"
          />
          <p id="child-key-help" className={styles.hint}>
            复制、粘贴四组字符，也可以自己输入；有无短横线都可以。
          </p>
          <label htmlFor="child-nickname">我的昵称</label>
          <input
            id="child-nickname"
            name="username"
            autoComplete="username"
            maxLength={64}
            required
            value={props.nickname}
            disabled={props.pending}
            onChange={(e) => props.onChange('nickname', e.target.value)}
            aria-describedby="child-nickname-help"
          />
          <p id="child-nickname-help" className={styles.hint}>
            用 1–12 个汉字、字母或数字，不需要填真实姓名。
          </p>
          <label htmlFor="child-pin">设置六位数字 PIN</label>
          <input
            id="child-pin"
            name="password"
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            pattern="[0-9]{6}"
            maxLength={6}
            minLength={6}
            required
            value={props.pin}
            disabled={props.pending}
            onChange={(e) => props.onChange('pin', e.target.value)}
            aria-describedby="child-pin-help"
          />
          <p id="child-pin-help" className={styles.hint}>
            像一个小密码，可以以 0 开头。选一组不全相同、也不连续的数字，只告诉家长。
          </p>
          {props.error && (
            <p role="alert" className={styles.notice}>
              {props.error}
            </p>
          )}
          <button type="submit" disabled={props.pending}>
            {props.pending ? '正在加入，请稍等…' : '加入家庭'}
          </button>
          <p className={styles.hint}>注册成功后，KEY 就完成任务了。以后无需重复注册。</p>
        </form>
      </section>
    </div>
  );
}

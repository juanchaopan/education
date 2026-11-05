import type { ChildAccess } from '@education/contracts';
import styles from './RegistrationForm.module.css';

export function ChildPinResetForm({
  child,
  pin,
  confirmation,
  pending,
  onPin,
  onConfirmation,
  onSubmit,
  onCancel,
}: {
  child: ChildAccess;
  pin: string;
  confirmation: string;
  pending?: boolean;
  onPin: (value: string) => void;
  onConfirmation: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      aria-label={`重置${child.nickname}的 PIN`}
    >
      <p>
        为 {child.nickname} 设置新的六位 PIN。确认后，这个孩子在所有设备上的旧登录都会退出，需用新
        PIN 重新登录。
      </p>
      <p className={styles.hint}>家庭码、昵称和学习记录会保留，不需要重新注册或生成 KEY。</p>
      <label htmlFor="child-new-pin">新的六位 PIN</label>
      <input
        id="child-new-pin"
        type="password"
        inputMode="numeric"
        autoComplete="new-password"
        pattern="[0-9]{6}"
        maxLength={6}
        required
        value={pin}
        onChange={(e) => onPin(e.target.value)}
        disabled={pending}
      />
      <label htmlFor="child-confirm-pin">再输入一次新 PIN</label>
      <input
        id="child-confirm-pin"
        type="password"
        inputMode="numeric"
        autoComplete="new-password"
        pattern="[0-9]{6}"
        maxLength={6}
        required
        value={confirmation}
        onChange={(e) => onConfirmation(e.target.value)}
        disabled={pending}
      />
      <button type="submit" disabled={pending || pin.length !== 6 || confirmation.length !== 6}>
        {pending ? '正在重置…' : '确认重置并退出旧登录'}
      </button>
      <button type="button" disabled={pending} onClick={onCancel}>
        取消
      </button>
    </form>
  );
}

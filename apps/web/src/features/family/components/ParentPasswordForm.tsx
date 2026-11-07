import type { ReactNode } from 'react';

type Wording = {
  id?: string;
  label?: string;
  purpose?: string;
  hint?: string;
  submitLabel?: string;
  pendingLabel?: string;
};

function wording({
  id = 'key-parent-password',
  label = '确认家长密码',
  purpose = '管理 KEY',
  hint = `为保护家庭，请先确认家长密码；确认后 5 分钟内可${purpose}。`,
  submitLabel = '确认密码',
  pendingLabel = '正在确认…',
}: Wording) {
  return { id, label, hint, submitLabel, pendingLabel };
}

// Confirms the parent password before a protected action. Fields the action
// needs as well come before the password, and ready keeps the button disabled
// until they are complete. An action that runs as soon as the password is
// confirmed says so in its own hint and pending label.
export function ParentPasswordForm({
  password,
  pending = false,
  ready = true,
  children,
  onChange,
  onSubmit,
  ...text
}: Wording & {
  password: string;
  pending?: boolean;
  ready?: boolean;
  children?: ReactNode;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  const { id, label, hint, submitLabel, pendingLabel } = wording(text);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <p>{hint}</p>
      {children}
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="password"
        autoComplete="current-password"
        maxLength={128}
        required
        value={password}
        onChange={(event) => onChange(event.target.value)}
        disabled={pending}
      />
      <button disabled={pending || !password || !ready} type="submit">
        {pending ? pendingLabel : submitLabel}
      </button>
    </form>
  );
}

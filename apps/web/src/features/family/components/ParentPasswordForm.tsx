import type { ReactNode } from 'react';
import { Button } from '../../../shared/ui/Button';
import { Form } from '../../../shared/ui/Form';
import { TextField } from '../../../shared/ui/TextField';

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
// confirmed says so in its own hint and pending label; one that cannot be
// undone is `destructive`, and its button takes the danger look.
export function ParentPasswordForm({
  password,
  pending = false,
  ready = true,
  destructive = false,
  children,
  onChange,
  onSubmit,
  ...text
}: Wording & {
  password: string;
  pending?: boolean;
  ready?: boolean;
  destructive?: boolean;
  children?: ReactNode;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  const { id, label, hint, submitLabel, pendingLabel } = wording(text);
  return (
    <Form onSubmit={onSubmit}>
      <p>{hint}</p>
      {children}
      <TextField
        id={id}
        label={label}
        type="password"
        autoComplete="current-password"
        maxLength={128}
        required
        value={password}
        onChange={(event) => onChange(event.target.value)}
        disabled={pending}
      />
      <Button
        variant={destructive ? 'danger' : 'primary'}
        disabled={pending || !password || !ready}
        type="submit"
      >
        {pending ? pendingLabel : submitLabel}
      </Button>
    </Form>
  );
}

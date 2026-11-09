import { Button } from '../../../shared/ui/Button';
import { Form } from '../../../shared/ui/Form';
import { Hint } from '../../../shared/ui/Hint';
import { Notice } from '../../../shared/ui/Notice';
import { TextField } from '../../../shared/ui/TextField';
import { PasswordHint } from './PasswordHint';

export type PasswordResetFormProps = {
  password: string;
  confirmation: string;
  pending?: boolean;
  error?: string;
  onPasswordChange: (password: string) => void;
  onConfirmationChange: (confirmation: string) => void;
  onSubmit: () => void;
};

// The new password is typed twice. What the change signs out is said beside
// the button that makes it, where the parent decides.
export function PasswordResetForm(props: PasswordResetFormProps) {
  const field = {
    type: 'password',
    autoComplete: 'new-password',
    icon: 'lock',
    required: true,
    minLength: 15,
    maxLength: 128,
    disabled: props.pending,
  } as const;
  return (
    <Form onSubmit={props.onSubmit} aria-busy={props.pending}>
      <TextField
        {...field}
        id="reset-password"
        label="新密码"
        hint={<PasswordHint password={props.password} />}
        name="password"
        value={props.password}
        onChange={(event) => props.onPasswordChange(event.target.value)}
      />
      <TextField
        {...field}
        id="reset-confirmation"
        label="再次输入新密码"
        name="confirmation"
        value={props.confirmation}
        onChange={(event) => props.onConfirmationChange(event.target.value)}
      />
      {props.error && <Notice tone="error">{props.error}</Notice>}
      <Hint>
        提交后，家庭的旧登录状态和未使用的注册 KEY 会失效；账号、家庭关联和学习进度会保留。
      </Hint>
      <Button type="submit" disabled={props.pending}>
        {props.pending ? '正在保存，请稍等…' : '确认设置新密码'}
      </Button>
    </Form>
  );
}

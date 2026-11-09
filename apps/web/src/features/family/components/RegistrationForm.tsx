import { Button } from '../../../shared/ui/Button';
import { Form } from '../../../shared/ui/Form';
import { Notice } from '../../../shared/ui/Notice';
import { TextField } from '../../../shared/ui/TextField';
import { PasswordHint } from './PasswordHint';

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

// A parent's own sign-up. Registering sends no mail: the parent signs in and
// sends the verification mail from there, which the receipt says plainly.
export function RegistrationForm(props: RegistrationFormProps) {
  if (props.submitted)
    return (
      <Notice tone="success" as="div">
        <h2>注册申请已受理</h2>
        <p>尚未发送验证邮件。登录后发送，并完成验证。</p>
      </Notice>
    );
  return (
    <Form onSubmit={props.onSubmit} aria-busy={props.pending}>
      <TextField
        id="parent-email"
        label="家长邮箱"
        hint="请使用您自己的邮箱，不需要填写孩子的信息。"
        icon="mail"
        name="email"
        type="email"
        autoComplete="username"
        required
        maxLength={254}
        value={props.email}
        disabled={props.pending}
        onChange={(event) => props.onEmailChange(event.target.value)}
      />
      <TextField
        id="parent-password"
        label="设置密码"
        hint={<PasswordHint password={props.password} />}
        icon="lock"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        value={props.password}
        disabled={props.pending}
        onChange={(event) => props.onPasswordChange(event.target.value)}
      />
      {props.error && <Notice tone="error">{props.error}</Notice>}
      {props.notice && <Notice>{props.notice}</Notice>}
      <Button type="submit" disabled={props.pending || !props.available}>
        {props.pending ? '正在保存，请稍等…' : '提交注册'}
      </Button>
    </Form>
  );
}

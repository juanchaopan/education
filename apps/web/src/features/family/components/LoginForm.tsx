import { Button } from '../../../shared/ui/Button';
import { Form } from '../../../shared/ui/Form';
import { MoreInfo } from '../../../shared/ui/MoreInfo';
import { Notice } from '../../../shared/ui/Notice';
import { TextField } from '../../../shared/ui/TextField';

export type LoginFormProps = {
  email: string;
  password: string;
  pending?: boolean;
  error?: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
};

// The parent's sign-in. The field names let a password manager fill it in.
export function LoginForm(props: LoginFormProps) {
  return (
    <>
      <Form onSubmit={props.onSubmit} aria-busy={props.pending}>
        <TextField
          id="login-email"
          label="登录邮箱"
          icon="mail"
          name="username"
          type="email"
          autoComplete="username"
          required
          maxLength={254}
          value={props.email}
          disabled={props.pending}
          onChange={(event) => props.onEmailChange(event.target.value)}
        />
        <TextField
          id="login-password"
          label="登录密码"
          icon="lock"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={props.password}
          disabled={props.pending}
          onChange={(event) => props.onPasswordChange(event.target.value)}
        />
        {props.error && <Notice tone="error">{props.error}</Notice>}
        <Button type="submit" disabled={props.pending}>
          {props.pending ? '正在登录…' : '登录'}
        </Button>
      </Form>
      <MoreInfo label="用公共设备登录">公共设备使用结束后，请退出账号。</MoreInfo>
    </>
  );
}

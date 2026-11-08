import { Button } from '../../../shared/ui/Button';
import { Form } from '../../../shared/ui/Form';
import { Hint } from '../../../shared/ui/Hint';
import { Notice } from '../../../shared/ui/Notice';
import { TextField } from '../../../shared/ui/TextField';
import { AccountLayout } from './AccountLayout';

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
  return (
    <AccountLayout
      titleId="login-title"
      title="家长登录"
      introduction={
        <>
          <h2>欢迎回来，继续陪伴探索</h2>
          <p>可使用浏览器的密码管理器记住密码。网站不会保存您的明文密码。</p>
          <p>公共设备使用结束后，请退出账号。</p>
        </>
      }
    >
      <Form onSubmit={props.onSubmit} aria-busy={props.pending}>
        <TextField
          id="login-email"
          label="登录邮箱"
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
          {props.pending ? '正在登录，请稍等…' : '登录'}
        </Button>
        <Hint>账号和学习进度不会因登录状态到期而删除。</Hint>
      </Form>
    </AccountLayout>
  );
}

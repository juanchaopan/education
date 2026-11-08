import { Button } from '../../../shared/ui/Button';
import { Card } from '../../../shared/ui/Card';
import { Form } from '../../../shared/ui/Form';
import { Notice } from '../../../shared/ui/Notice';
import { TextField } from '../../../shared/ui/TextField';

export type PasswordResetFormProps = {
  password: string;
  confirmation: string;
  pending?: boolean;
  error?: string;
  onPasswordChange: (password: string) => void;
  onConfirmationChange: (confirmation: string) => void;
  onSubmit: () => void;
};

export function PasswordResetForm(props: PasswordResetFormProps) {
  return (
    <Card aria-labelledby="reset-title">
      <h1 id="reset-title">设置新的家长密码</h1>
      <p>提交后，家庭的旧登录状态和未使用注册 KEY 会失效。账号、家庭关联和学习进度会保留。</p>
      <Form onSubmit={props.onSubmit} aria-busy={props.pending}>
        <TextField
          id="reset-password"
          label="新密码"
          hint="15–128 个字符，最多 512 字节。可以使用空格或一句好记的话。"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={15}
          maxLength={128}
          value={props.password}
          disabled={props.pending}
          onChange={(event) => props.onPasswordChange(event.target.value)}
        />
        <TextField
          id="reset-confirmation"
          label="再次输入新密码"
          name="confirmation"
          type="password"
          autoComplete="new-password"
          required
          minLength={15}
          maxLength={128}
          value={props.confirmation}
          disabled={props.pending}
          onChange={(event) => props.onConfirmationChange(event.target.value)}
        />
        {props.error && <Notice tone="error">{props.error}</Notice>}
        <Button type="submit" disabled={props.pending}>
          {props.pending ? '正在保存，请稍等…' : '确认设置新密码'}
        </Button>
      </Form>
    </Card>
  );
}

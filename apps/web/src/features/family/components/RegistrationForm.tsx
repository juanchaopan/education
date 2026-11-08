import { Button } from '../../../shared/ui/Button';
import { Form } from '../../../shared/ui/Form';
import { Hint } from '../../../shared/ui/Hint';
import { Icon } from '../../../shared/ui/Icon';
import { Notice } from '../../../shared/ui/Notice';
import { TextField } from '../../../shared/ui/TextField';
import { AccountLayout } from './AccountLayout';

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

export function RegistrationForm(props: RegistrationFormProps) {
  return (
    <AccountLayout
      titleId="registration-title"
      title="创建家长账号"
      introduction={
        <>
          <Icon name="home" badge />
          <h2>陪伴探索，从这里开始</h2>
          <p>先为自己创建家长账号。之后，孩子可以用您的注册 KEY 加入家庭。</p>
          <p>慢慢来，和孩子一起看见每一步进步。</p>
        </>
      }
    >
      <Hint>请使用您自己的邮箱，不需要填写孩子的信息。</Hint>
      {props.submitted ? (
        <Notice tone="success" as="div">
          <h3>注册申请已受理</h3>
          <p>若此邮箱尚未注册，待验证账号已保存。重复提交不会创建另一个家庭。</p>
          <p>尚未发送验证邮件。请点击“已有账号？去登录”，登录后发送验证邮件并完成验证。</p>
        </Notice>
      ) : (
        <RegistrationFields {...props} />
      )}
    </AccountLayout>
  );
}

function RegistrationFields(props: RegistrationFormProps) {
  return (
    <Form onSubmit={props.onSubmit} aria-busy={props.pending}>
      <TextField
        id="parent-email"
        label="家长邮箱"
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
        hint="15–128 个字符。可以用一句好记的话，也可以粘贴密码管理器生成的密码。"
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
      <Hint>家长验证邮箱并登录后，可以生成 KEY，邀请孩子加入家庭。</Hint>
    </Form>
  );
}

import { Button } from '../../../shared/ui/Button';
import { Form } from '../../../shared/ui/Form';
import { Hint } from '../../../shared/ui/Hint';
import { Icon } from '../../../shared/ui/Icon';
import { Notice } from '../../../shared/ui/Notice';
import { TextField } from '../../../shared/ui/TextField';
import { IntroductionLayout } from './IntroductionLayout';

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
  return (
    <IntroductionLayout
      titleId="child-form-title"
      title="加入我的家庭"
      introduction={
        <>
          <Icon name="key" badge />
          <h2>我们一起，迈出第一步</h2>
          <p>请家长把注册 KEY 给你。它像一张邀请卡，帮助你加入自己的家庭。</p>
          <p>慢慢填就好。遇到困难，可以请家长陪你一起完成。</p>
        </>
      }
    >
      <ChildRegistrationFields {...props} />
    </IntroductionLayout>
  );
}

function ChildRegistrationFields(props: ChildRegistrationFormProps) {
  return (
    <Form onSubmit={props.onSubmit} aria-busy={props.pending}>
      <TextField
        id="child-key"
        label="家长给我的 KEY"
        hint="复制、粘贴四组字符，也可以自己输入；有无短横线都可以。"
        name="registration-key"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        maxLength={32}
        required
        value={props.registrationKey}
        disabled={props.pending}
        onChange={(event) => props.onChange('registrationKey', event.target.value)}
      />
      <TextField
        id="child-nickname"
        label="我的昵称"
        hint="用 1–12 个汉字、字母或数字，不需要填真实姓名。"
        name="username"
        autoComplete="username"
        maxLength={64}
        required
        value={props.nickname}
        disabled={props.pending}
        onChange={(event) => props.onChange('nickname', event.target.value)}
      />
      <TextField
        id="child-pin"
        label="设置六位数字 PIN"
        hint="像一个小密码，可以以 0 开头。选一组不全相同、也不连续的数字，只告诉家长。"
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
        onChange={(event) => props.onChange('pin', event.target.value)}
      />
      {props.error && <Notice tone="error">{props.error}</Notice>}
      <Button type="submit" disabled={props.pending}>
        {props.pending ? '正在加入，请稍等…' : '加入家庭'}
      </Button>
      <Hint>注册成功后，KEY 就完成任务了。以后无需重复注册。</Hint>
    </Form>
  );
}

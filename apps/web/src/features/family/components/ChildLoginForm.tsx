import { Button } from '../../../shared/ui/Button';
import { Form } from '../../../shared/ui/Form';
import { Hint } from '../../../shared/ui/Hint';
import { Icon } from '../../../shared/ui/Icon';
import { Notice } from '../../../shared/ui/Notice';
import { Switch } from '../../../shared/ui/Switch';
import { TextField } from '../../../shared/ui/TextField';
import { IntroductionLayout } from './IntroductionLayout';

export type ChildLoginFields = { familyCode: string; nickname: string; pin: string };
export type ChildLoginFormProps = ChildLoginFields & {
  remember: boolean;
  pending?: boolean;
  error?: string;
  onChange: (field: keyof ChildLoginFields, value: string) => void;
  onRemember: (value: boolean) => void;
  onSubmit: () => void;
};

export function ChildLoginForm(props: ChildLoginFormProps) {
  return (
    <IntroductionLayout
      titleId="child-login-title"
      title="孩子登录"
      introduction={
        <>
          <Icon name="user" badge />
          <h2>欢迎回来，小小探索家</h2>
          <p>慢慢来，请输入自己的六位 PIN。</p>
          <p>第一次来这台设备？请家长从家长空间复制家庭码，再填上注册时的昵称。</p>
          <p>登录后，下次打开通常可以直接回来。共用设备时，离开前记得退出。</p>
        </>
      }
    >
      <ChildLoginFields {...props} />
    </IntroductionLayout>
  );
}

function ChildLoginFields(props: ChildLoginFormProps) {
  return (
    <Form onSubmit={props.onSubmit} aria-busy={props.pending}>
      <TextField
        id="child-family"
        label="我的家庭码"
        hint="家长空间里随时可查看，不用背下来。不是注册 KEY。"
        name="family-code"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        required
        maxLength={32}
        value={props.familyCode}
        disabled={props.pending}
        onChange={(event) => props.onChange('familyCode', event.target.value)}
      />
      <TextField
        id="child-nickname"
        label="我的昵称"
        name="username"
        autoComplete="username"
        required
        maxLength={64}
        value={props.nickname}
        disabled={props.pending}
        onChange={(event) => props.onChange('nickname', event.target.value)}
      />
      <TextField
        id="child-pin"
        label="我的六位 PIN"
        name="password"
        type="password"
        autoComplete="current-password"
        inputMode="numeric"
        pattern="[0-9]{6}"
        minLength={6}
        maxLength={6}
        required
        value={props.pin}
        disabled={props.pending}
        onChange={(event) => props.onChange('pin', event.target.value)}
      />
      <Switch
        label="在这台设备上记住家庭码和昵称"
        checked={props.remember}
        disabled={props.pending}
        onChange={props.onRemember}
      />
      <Hint>网站不会记住明文 PIN。共用设备可取消勾选。</Hint>
      {props.error && <Notice tone="error">{props.error}</Notice>}
      <Button type="submit" disabled={props.pending}>
        {props.pending ? '正在打开你的空间…' : '进入我的空间'}
      </Button>
    </Form>
  );
}

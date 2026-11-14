import { Button } from '../../../shared/ui/Button';
import { Form } from '../../../shared/ui/Form';
import { MoreInfo } from '../../../shared/ui/MoreInfo';
import { Notice } from '../../../shared/ui/Notice';
import { Switch } from '../../../shared/ui/Switch';
import { TextField } from '../../../shared/ui/TextField';

export type ChildLoginFields = { familyCode: string; nickname: string; pin: string };
export type ChildLoginFormProps = ChildLoginFields & {
  remember: boolean;
  pending?: boolean;
  error?: string;
  onChange: (field: keyof ChildLoginFields, value: string) => void;
  onRemember: (value: boolean) => void;
  onSubmit: () => void;
};

// A child's sign-in: the family code, the nickname and the six-digit PIN.
// The field names let a password manager fill it in, and the PIN is never
// shown. The device can remember the family code and the nickname.
export function ChildLoginForm(props: ChildLoginFormProps) {
  return (
    <Form onSubmit={props.onSubmit} aria-busy={props.pending}>
      <TextField
        id="child-family"
        label="我的家庭码"
        icon="home"
        hint="家长空间里随时可查看。"
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
        icon="user"
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
        icon="lock"
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
      <MoreInfo label="共用的设备">网站不会记住明文 PIN。共用设备可以关掉这个开关。</MoreInfo>
      {props.error && <Notice tone="error">{props.error}</Notice>}
      <Button type="submit" disabled={props.pending}>
        {props.pending ? '正在打开你的空间…' : '进入我的空间'}
      </Button>
    </Form>
  );
}

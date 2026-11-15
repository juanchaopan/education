import { Button } from '../../../shared/ui/Button';
import { Form } from '../../../shared/ui/Form';
import { Notice } from '../../../shared/ui/Notice';
import { TextField } from '../../../shared/ui/TextField';
import { NicknameHint } from './NicknameHint';
import { groupRegistrationKey } from './registration-key';

export type ChildRegistrationFields = { registrationKey: string; nickname: string; pin: string };
export type ChildRegistrationFormProps = ChildRegistrationFields & {
  pending?: boolean;
  error?: string;
  onChange: (field: keyof ChildRegistrationFields, value: string) => void;
  onSubmit: () => void;
};

// A child joins the family: the KEY a parent gave, grouped in fours as it is
// typed, a nickname with its count, and a new six-digit PIN. Only what a
// child must know is written beside the fields; the rules for the nickname
// and the PIN come back from the server when an answer breaks them.
export function ChildRegistrationForm(props: ChildRegistrationFormProps) {
  return (
    <Form onSubmit={props.onSubmit} aria-busy={props.pending}>
      <TextField
        id="child-key"
        label="家长给我的 KEY"
        icon="key"
        placeholder="XXXX-XXXX-XXXX-XXXX"
        name="registration-key"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        maxLength={32}
        required
        value={props.registrationKey}
        disabled={props.pending}
        onChange={(event) =>
          props.onChange('registrationKey', groupRegistrationKey(event.target.value))
        }
      />
      <TextField
        id="child-nickname"
        label="我的昵称"
        icon="user"
        hint={<NicknameHint nickname={props.nickname} />}
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
        icon="lock"
        hint="只告诉家长"
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
    </Form>
  );
}

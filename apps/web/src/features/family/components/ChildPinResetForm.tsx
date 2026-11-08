import type { ChildAccess } from '@education/contracts';
import { Button } from '../../../shared/ui/Button';
import { Form } from '../../../shared/ui/Form';
import { Hint } from '../../../shared/ui/Hint';
import { TextField } from '../../../shared/ui/TextField';

type Props = {
  child: ChildAccess;
  pin: string;
  confirmation: string;
  pending?: boolean;
  onPin: (value: string) => void;
  onConfirmation: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
};

// A new PIN is six digits typed twice; the fields share everything else.
const pinField = {
  type: 'password',
  inputMode: 'numeric',
  autoComplete: 'new-password',
  pattern: '[0-9]{6}',
  maxLength: 6,
  required: true,
} as const;

export function ChildPinResetForm({
  child,
  pin,
  confirmation,
  pending,
  onPin,
  onConfirmation,
  onSubmit,
  onCancel,
}: Props) {
  return (
    <Form onSubmit={onSubmit} aria-label={`重置${child.nickname}的 PIN`}>
      <p>
        为 {child.nickname} 设置新的六位 PIN。确认后，这个孩子在所有设备上的旧登录都会退出，需用新
        PIN 重新登录。
      </p>
      <Hint>家庭码、昵称和学习记录会保留，不需要重新注册或生成 KEY。</Hint>
      <TextField
        {...pinField}
        id="child-new-pin"
        label="新的六位 PIN"
        value={pin}
        onChange={(event) => onPin(event.target.value)}
        disabled={pending}
      />
      <TextField
        {...pinField}
        id="child-confirm-pin"
        label="再输入一次新 PIN"
        value={confirmation}
        onChange={(event) => onConfirmation(event.target.value)}
        disabled={pending}
      />
      <Button type="submit" disabled={pending || pin.length !== 6 || confirmation.length !== 6}>
        {pending ? '正在重置…' : '确认重置并退出旧登录'}
      </Button>
      <Button disabled={pending} onClick={onCancel}>
        取消
      </Button>
    </Form>
  );
}

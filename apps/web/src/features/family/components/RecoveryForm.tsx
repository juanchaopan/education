import type { RecoveryRequest } from '@education/contracts';
import { Actions } from '../../../shared/ui/Actions';
import { Button } from '../../../shared/ui/Button';
import { Form } from '../../../shared/ui/Form';
import { Loading } from '../../../shared/ui/Loading';
import { MoreInfo } from '../../../shared/ui/MoreInfo';
import { Notice } from '../../../shared/ui/Notice';
import { TextField } from '../../../shared/ui/TextField';

export type RecoveryFormProps = {
  email: string;
  pending?: boolean;
  received?: boolean;
  error?: string;
  onEmailChange: (email: string) => void;
  onSubmit: (action: RecoveryRequest['action']) => void;
};

// Asks for the recovery mail. The receipt reads the same whether or not the
// address has an account, so the page never tells who is registered. How
// long it takes, how long the link lasts and how retries work are folded
// away for whoever needs them.
export function RecoveryForm(props: RecoveryFormProps) {
  return (
    <>
      <Form onSubmit={() => props.onSubmit('send')} aria-busy={props.pending}>
        <TextField
          id="recovery-email"
          label="注册邮箱"
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
        <Button type="submit" disabled={props.pending}>
          {props.pending ? '正在受理…' : '发送恢复邮件'}
        </Button>
        {props.pending && <Loading label="正在处理恢复申请…" />}
        {props.received && <RecoveryReceived {...props} />}
        {props.error && <Notice tone="error">{props.error}</Notice>}
      </Form>
      <MoreInfo label="邮件规则">
        <p>为保护账号隐私，受理通常需要约 20 秒，请勿反复点击。</p>
        <p>链接 30 分钟有效。未收到时，至少等 60 秒再试；达到每日上限时，请明天再来。</p>
        <p>重试只针对服务商明确暂时拒绝的邮件，最多三次；不确定是否送达时不会重复投递。</p>
      </MoreInfo>
    </>
  );
}

// Once a request is received, the parent can retry the same mail or send a
// new one, which retires the old link.
function RecoveryReceived({ pending, onSubmit }: RecoveryFormProps) {
  return (
    <>
      <Notice tone="success">
        恢复申请已受理。如果该邮箱已注册，您会收到邮件，请查看收件箱和垃圾箱。
      </Notice>
      <Actions>
        <Button variant="secondary" disabled={pending} onClick={() => onSubmit('retry')}>
          重试同一封邮件
        </Button>
        <Button variant="secondary" disabled={pending} onClick={() => onSubmit('resend')}>
          重新发送（旧链接失效）
        </Button>
      </Actions>
    </>
  );
}

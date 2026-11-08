import type { RecoveryRequest } from '@education/contracts';
import { Button } from '../../../shared/ui/Button';
import { Card } from '../../../shared/ui/Card';
import { Form } from '../../../shared/ui/Form';
import { Hint } from '../../../shared/ui/Hint';
import { Loading } from '../../../shared/ui/Loading';
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

export function RecoveryForm(props: RecoveryFormProps) {
  return (
    <Card aria-labelledby="recovery-title">
      <h1 id="recovery-title">找回家长密码</h1>
      <p>填写注册邮箱。我们会通过邮件帮助您设置新密码，不会删除账号或学习进度。</p>
      <Form onSubmit={() => props.onSubmit('send')} aria-busy={props.pending}>
        <TextField
          id="recovery-email"
          label="注册邮箱"
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
          {props.pending ? '正在受理，请稍等…' : '发送恢复邮件'}
        </Button>
        <Hint>为保护账号隐私，受理通常需要约 20 秒。请勿反复点击。</Hint>
        {props.pending && <Loading label="请稍等，正在处理恢复申请。" />}
        {props.received && <RecoveryReceived {...props} />}
        {props.error && <Notice tone="error">{props.error}</Notice>}
      </Form>
    </Card>
  );
}

// Once a request is received, the parent can retry the same mail or send a
// new one, which retires the old link.
function RecoveryReceived({ pending, onSubmit }: RecoveryFormProps) {
  return (
    <>
      <Notice tone="success" as="div">
        <p>
          恢复申请已受理。如果该邮箱已注册且未超过发送限额，您会收到邮件。请检查收件箱和垃圾箱。
        </p>
        <p>链接 30 分钟有效。未收到时，至少等 60 秒再试；达到每日上限时，请明天再来。</p>
      </Notice>
      <Button disabled={pending} onClick={() => onSubmit('retry')}>
        重试同一封邮件
      </Button>
      <Hint>只会重试服务商明确暂时拒绝的邮件，最多三次；不确定是否送达时不会重复投递。</Hint>
      <Button disabled={pending} onClick={() => onSubmit('resend')}>
        重新发送（旧链接失效）
      </Button>
    </>
  );
}

import type { VerificationAction, VerificationStatus } from '@education/contracts';
import { Actions } from '../../../shared/ui/Actions';
import { Button } from '../../../shared/ui/Button';
import { Hint } from '../../../shared/ui/Hint';
import { Loading } from '../../../shared/ui/Loading';
import { MoreInfo } from '../../../shared/ui/MoreInfo';
import { Notice } from '../../../shared/ui/Notice';
import { ParentAddress } from './ParentAddress';

export type VerificationNoticeProps = {
  email: string;
  status?: VerificationStatus;
  loading?: boolean;
  pending?: boolean;
  error?: string;
  onSend: (action: VerificationAction['action']) => void;
  onRefresh: () => void;
};

type MailProps = VerificationNoticeProps & { status: VerificationStatus };

// One sentence for each state of the mail. None of them claims more than the
// mail service has said: accepted is not delivered, and delivered is not
// verified.
const states: Record<VerificationStatus['status'], string> = {
  'not-sent': '还没有发送验证邮件。',
  sending: '邮件正在发送，请稍后刷新状态。',
  accepted: '邮件服务商已接受请求，请查看收件箱和垃圾箱。',
  retryable: '邮件暂未被接受，可以安全重试。',
  rejected: '邮件服务商拒绝了这次发送，请稍后再试。',
  'authorization-failed': '网站发信暂时不可用，请稍后再试。',
  unknown: '不确定邮件是否已发出，请先查看收件箱和垃圾箱。',
  expired: '验证链接已过期，请重新发送。',
  verified: '邮箱已验证，退出后重新登录即可。',
};

// The verification step of a parent who has signed up: whose address it is,
// where its mail stands, and the one action that moves it on.
export function VerificationNotice(props: VerificationNoticeProps) {
  return (
    <>
      <ParentAddress email={props.email} verified={props.status?.status === 'verified'} />
      {props.loading && <Loading label="正在查看发送状态…" />}
      {props.status && <MailState {...props} status={props.status} />}
      {props.error && <Notice tone="error">{props.error}</Notice>}
      <MoreInfo label="邮件规则">
        链接 24 小时有效。打开邮件里的链接后，还要在页面上确认才算验证。重新发送会让旧链接失效。
      </MoreInfo>
    </>
  );
}

function MailState(props: MailProps) {
  const { status } = props;
  if (!status.enabled) return <p role="status">验证邮件服务尚未开放，请稍后再来。</p>;
  const cooling = status.status !== 'verified' && status.retryAfter > 0;
  return (
    <>
      <p role="status">{states[status.status]}</p>
      {cooling && <Hint>约 {status.retryAfter} 秒后可以再发，到时请刷新状态。</Hint>}
      <MailActions {...props} />
    </>
  );
}

// Sending a first mail, sending a new one that retires the old link, or
// retrying the same mail when the service turned it away for now. A verified
// address needs none of them, only a fresh look at its status.
function MailActions({ status, pending, loading, onSend, onRefresh }: MailProps) {
  const open = status.status !== 'verified';
  const first = status.status === 'not-sent';
  const waiting = !!pending || status.status === 'sending' || status.retryAfter > 0;
  return (
    <Actions>
      {open && (
        <Button disabled={waiting} onClick={() => onSend(first ? 'send' : 'resend')}>
          {pending ? '正在发送…' : first ? '发送验证邮件' : '重新发送（旧链接失效）'}
        </Button>
      )}
      {open && status.canRetry && (
        <Button variant="secondary" disabled={waiting} onClick={() => onSend('retry')}>
          安全重试这次发送
        </Button>
      )}
      <Button variant="text" disabled={pending || loading} onClick={onRefresh}>
        刷新发送状态
      </Button>
    </Actions>
  );
}

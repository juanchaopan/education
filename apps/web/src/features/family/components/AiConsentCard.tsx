import type { AiConsentChange, AiConsentView } from '@education/contracts';
import { Actions } from '../../../shared/ui/Actions';
import { Button } from '../../../shared/ui/Button';
import { Hint } from '../../../shared/ui/Hint';
import { Loading } from '../../../shared/ui/Loading';
import { Notice } from '../../../shared/ui/Notice';
import { StandaloneLink } from '../../../shared/ui/StandaloneLink';
import { ParentCard } from './ParentCard';
import { ParentPasswordForm } from './ParentPasswordForm';
import { StatusBadge } from './StatusBadge';
import styles from './AiConsentCard.module.css';

type Policy = AiConsentView['policies'][number];
type Props = {
  view?: AiConsentView;
  loading: boolean;
  pending: boolean;
  error?: string;
  password: string;
  onPassword: (password: string) => void;
  onConfirm: () => void;
  onChange: (decision: AiConsentChange) => void;
  onRefresh: () => void;
};

const states: Record<Policy['state'], string> = {
  ungranted: '未授权',
  granted: '已授权',
  revoked: '已撤回',
  'policy-changed': '政策已更新，需要重新授权',
};

// Consent and availability are separate: a granted service that this
// deployment cannot call sends nothing, and the parent is told so. A service
// that is switched on still waits for consent and remaining budget.
const availability: Record<Policy['availability'], string> = {
  ready: '已启用：只在已授权、额度够用时发送孩子提交的内容。',
  unavailable: '暂未启用：现在不会发送任何内容，孩子用题目提示继续。',
};

const budgets: Record<AiConsentView['tutoringBudget'], string> = {
  unset: 'AI 解题提示预算未设置。',
  available: 'AI 解题提示已设置费用上限。',
  limited: 'AI 解题提示的可用额度不足，可继续使用题目引导。',
};

// The provider's own data policy, a page outside the site that the router
// opens as an ordinary link.
const providerPolicy = 'https://developers.openai.com/api/docs/guides/your-data';

// The family's consent to each outside AI service. Everything a parent must
// know to decide stays on the card: what each service is sent, what for, how
// the app and the provider keep it, what withdrawing does, and the
// provider's own data policy.
export function AiConsentCard(props: Props) {
  const { view, pending, onChange } = props;
  return (
    <ParentCard
      titleId="ai-consent-title"
      icon="sparkle"
      title="外部 AI 授权"
      action={
        <Button variant="text" disabled={pending} onClick={props.onRefresh}>
          刷新授权状态
        </Button>
      }
    >
      <p>按用途为本家庭的孩子选择授权。服务启用后，才会处理已授权的输入。</p>
      <p>撤回后将停止新的发送。此前已发送的内容仍按供应商的保留政策处理。</p>
      {view && (
        <p role="status" className={styles.budget}>
          {budgets[view.tutoringBudget]}
        </p>
      )}
      <StandaloneLink to={providerPolicy}>查看 OpenAI 的数据保留说明</StandaloneLink>
      {props.loading && <Loading label="正在确认授权状态…" />}
      {props.error && <Notice tone="error">{props.error}</Notice>}
      {view?.policies.map((policy) => (
        <PolicyCard
          key={policy.scope}
          policy={policy}
          disabled={pending || view.reauthenticationRequired}
          onChange={onChange}
        />
      ))}
      {view?.reauthenticationRequired && (
        <ParentPasswordForm
          id="consent-parent-password"
          label="修改 AI 授权前确认家长密码"
          purpose="修改 AI 授权"
          password={props.password}
          pending={pending}
          onChange={props.onPassword}
          onSubmit={props.onConfirm}
        />
      )}
    </ParentCard>
  );
}

// One service: its consent as a badge, settled only once granted, then what
// it is sent and kept for, and the buttons that change the consent.
function PolicyCard({
  policy,
  disabled,
  onChange,
}: {
  policy: Policy;
  disabled: boolean;
  onChange: Props['onChange'];
}) {
  const { scope, title, state, policyVersion, revision } = policy;
  const label = `consent-${scope}`;
  const update = (granted: boolean) => onChange({ scope, policyVersion, revision, granted });
  return (
    <div role="group" aria-labelledby={label} className={styles.policy}>
      <div className={styles.heading}>
        <h3 id={label}>{title}</h3>
        <StatusBadge tone={state === 'granted' ? 'ok' : 'wait'} live>
          {states[state]}
        </StatusBadge>
      </div>
      <Hint>
        {policy.provider} · 政策版本 {policyVersion}
      </Hint>
      <p className={styles.availability}>{availability[policy.availability]}</p>
      <dl>
        <dt>会发送什么</dt>
        <dd>{policy.inputs}</dd>
        <dt>用来做什么</dt>
        <dd>{policy.purpose}</dd>
        <dt>应用如何保存</dt>
        <dd>{policy.appRetention}</dd>
        <dt>供应商如何保留</dt>
        <dd>{policy.providerRetention}</dd>
      </dl>
      <Actions>
        {state !== 'granted' && (
          <Button disabled={disabled} onClick={() => update(true)}>
            授权 {title}
          </Button>
        )}
        {(state === 'granted' || state === 'policy-changed') && (
          <Button variant="secondary" disabled={disabled} onClick={() => update(false)}>
            撤回 {title}授权
          </Button>
        )}
      </Actions>
    </div>
  );
}

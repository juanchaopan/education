import type { AiConsentChange, AiConsentView } from '@education/contracts';
import { ParentPasswordForm } from './ParentPasswordForm';
import card from './RegistrationForm.module.css';
import panel from './RegistrationKeyCard.module.css';
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

const budgets: Record<AiConsentView['tutoringBudget'], string> = {
  unset: 'AI 解题提示预算未设置。',
  available: 'AI 解题提示已设置费用上限。',
  limited: 'AI 解题提示的可用额度不足，可继续使用题目引导。',
};

export function AiConsentCard(props: Props) {
  const { view, pending, onChange } = props;
  return (
    <section className={`${card.card} ${panel.panel}`} aria-labelledby="ai-consent-title">
      <h2 id="ai-consent-title">外部 AI 授权</h2>
      <p>按用途为本家庭的孩子选择授权。服务通过启用检查后，才会处理已授权的输入。</p>
      <p>撤回后将停止新的发送。此前已发送的内容仍按供应商的保留政策处理。</p>
      {view && <p role="status">{budgets[view.tutoringBudget]}</p>}
      <p>
        <a href="https://developers.openai.com/api/docs/guides/your-data">
          查看 OpenAI 的数据保留说明
        </a>
      </p>
      {props.loading && <p role="status">正在确认授权状态…</p>}
      {props.error && (
        <p role="alert" className={card.notice}>
          {props.error}
        </p>
      )}
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
      <div className={panel.actions}>
        <button type="button" disabled={pending} onClick={props.onRefresh}>
          刷新授权状态
        </button>
      </div>
    </section>
  );
}

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
      <h3 id={label}>{title}</h3>
      <p className={card.hint}>
        {policy.provider} · 政策版本 {policyVersion}
      </p>
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
      <p role="status">
        <strong>{states[state]}</strong>
      </p>
      <div className={panel.actions}>
        {state !== 'granted' && (
          <button type="button" disabled={disabled} onClick={() => update(true)}>
            授权 {title}
          </button>
        )}
        {(state === 'granted' || state === 'policy-changed') && (
          <button type="button" disabled={disabled} onClick={() => update(false)}>
            撤回 {title}授权
          </button>
        )}
      </div>
    </div>
  );
}

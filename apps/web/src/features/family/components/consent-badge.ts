import type { AiConsentView } from '@education/contracts';

export type ConsentBadge = { text: string; tone: 'ok' | 'wait' };

// Where the family's AI consent stands, in one badge. A deployment that
// cannot call any service sends nothing whatever was granted, so that comes
// first; a changed policy needs the parent before anything else.
export function consentBadge({ policies }: AiConsentView): ConsentBadge {
  if (policies.every((policy) => policy.availability === 'unavailable'))
    return { text: '暂未启用', tone: 'wait' };
  if (policies.some((policy) => policy.state === 'policy-changed'))
    return { text: '需重新授权', tone: 'wait' };
  const granted = policies.filter((policy) => policy.state === 'granted').length;
  if (!granted) return { text: '未授权', tone: 'wait' };
  return granted === policies.length
    ? { text: '已授权', tone: 'ok' }
    : { text: '部分授权', tone: 'ok' };
}

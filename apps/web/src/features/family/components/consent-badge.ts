import type { AiConsentView } from '@education/contracts';

export type ConsentBadge = { text: string; tone: 'ok' | 'wait' };

// Where the family's AI consent stands, in one badge, over the services this
// deployment can call: a service that is switched off sends nothing whatever
// was granted. With none switched on that is all there is to say; a changed
// policy needs the parent before anything else.
export function consentBadge({ policies }: AiConsentView): ConsentBadge {
  const live = policies.filter((policy) => policy.availability === 'ready');
  if (!live.length) return { text: '暂未启用', tone: 'wait' };
  if (live.some((policy) => policy.state === 'policy-changed'))
    return { text: '需重新授权', tone: 'wait' };
  const granted = live.filter((policy) => policy.state === 'granted').length;
  if (!granted) return { text: '未授权', tone: 'wait' };
  return granted === live.length
    ? { text: '已授权', tone: 'ok' }
    : { text: '部分授权', tone: 'ok' };
}

import type { AiConsentView } from '@education/contracts';

export type ConsentPolicy = AiConsentView['policies'][number];

// One outside AI service as the consent view lists it, granted and switched
// on unless the test says otherwise. Test fixture only.
export function consentPolicy(changes: Partial<ConsentPolicy> = {}): ConsentPolicy {
  return {
    scope: 'openai-tutoring',
    policyVersion: 1,
    title: 'AI 解题提示',
    provider: 'OpenAI',
    inputs: '孩子提交的问题',
    purpose: '给出提示',
    appRetention: '不保存原文',
    providerRetention: '按供应商政策保留',
    revision: null,
    state: 'granted',
    availability: 'ready',
    ...changes,
  };
}

// A family's consent view over the given services.
export function consentView(...policies: ConsentPolicy[]): AiConsentView {
  return { reauthenticationRequired: false, tutoringBudget: 'unset', policies };
}

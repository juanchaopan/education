import type {
  AiAvailability,
  AiConsentChange,
  AiConsentScope,
  AiConsentView,
} from '@education/contracts';
import type pg from 'pg';
import { aiConsentPolicies } from '../domain/ai-consent-policy.js';
import {
  childHasAiConsent,
  readAiConsent,
  saveAiConsent,
} from '../repositories/postgres-ai-consent.js';
import type { AuthorizedParent } from '../repositories/session-transaction.js';
import type { Credentials, ParentTransaction } from './parent-transaction.js';
import { RequestError } from '../../shared/request-error.js';

type ChildTransaction = <T>(
  credentials: Credentials,
  work: (client: pg.PoolClient, child: string) => Promise<T>,
) => Promise<T>;
type Decision = Awaited<ReturnType<typeof readAiConsent>>[number];

// Consent is the family's decision; availability is whether this deployment
// can call each service at all, fixed when the service is built.
export function createAiConsentService(
  parentTransaction: ParentTransaction,
  childTransaction: ChildTransaction,
  budgetStatus: (client: pg.PoolClient) => Promise<AiConsentView['tutoringBudget']>,
  availability: AiAvailability,
) {
  const withChildConsent = <T>(
    credentials: Credentials,
    scope: AiConsentScope,
    work: (client: pg.PoolClient, child: string) => Promise<T>,
  ) =>
    childTransaction(credentials, async (client, child) => {
      if (!(await childHasAiConsent(client, child, aiConsentPolicies[scope])))
        throw new RequestError(403, '需要家长授权才能使用这个 AI 服务。');
      return work(client, child);
    });

  const snapshot = async (client: pg.PoolClient, parent: AuthorizedParent, records: Decision[]) =>
    view(parent, records, await budgetStatus(client), availability);

  return {
    withChildConsent,
    read: (credentials: Credentials) =>
      parentTransaction(credentials, async (client, parent) =>
        snapshot(client, parent, await readAiConsent(client, parent.familyId)),
      ),
    change: (credentials: Credentials, input: AiConsentChange) =>
      parentTransaction(credentials, async (client, parent) => {
        if (!parent.recent) throw new RequestError(403, '请重新确认家长密码，再修改 AI 授权。');
        const records = await readAiConsent(client, parent.familyId);
        const current = records.find((record) => record.scope === input.scope);
        requireCurrentDecision(input, current);
        if (current?.policyVersion === input.policyVersion && current.granted === input.granted)
          return snapshot(client, parent, records);
        await saveAiConsent(client, parent.familyId, input);
        return snapshot(client, parent, await readAiConsent(client, parent.familyId));
      }),
    dispatch: async <T>(
      credentials: Credentials,
      scope: AiConsentScope,
      start: (signal: AbortSignal) => Promise<T>,
    ) => {
      const { response } = await withChildConsent(credentials, scope, async () => {
        // The adapter starts one bounded request under the family lock. Stream
        // consumers run after this transaction returns.
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5_000);
        try {
          return { response: await start(controller.signal) };
        } finally {
          clearTimeout(timeout);
        }
      });
      return response;
    },
    // Rejects unless the child is still signed in and the family still consents.
    // The child transaction reads an undefined result as a missing session, so
    // the check returns a value of its own.
    confirm: async (credentials: Credentials, scope: AiConsentScope) => {
      await withChildConsent(credentials, scope, async () => true);
    },
  };
}

function requireCurrentDecision(input: AiConsentChange, current: Decision | undefined) {
  if (
    input.policyVersion !== aiConsentPolicies[input.scope].policyVersion ||
    (current?.policyVersion ?? 0) > input.policyVersion ||
    input.revision !== (current?.revision ?? null)
  )
    throw new RequestError(409, '政策或授权状态已更新，请查看最新状态后再确认。');
}

function view(
  parent: AuthorizedParent,
  records: Decision[],
  tutoringBudget: AiConsentView['tutoringBudget'],
  availability: AiAvailability,
): AiConsentView {
  return {
    reauthenticationRequired: !parent.recent,
    tutoringBudget,
    policies: Object.values(aiConsentPolicies).map((policy) => {
      const record = records.find((entry) => entry.scope === policy.scope);
      return {
        ...policy,
        revision: record?.revision ?? null,
        state: state(policy.policyVersion, record),
        availability: availability[policy.scope],
      };
    }),
  };
}

function state(version: number, record?: Decision): AiConsentView['policies'][number]['state'] {
  if (!record) return 'ungranted';
  if (!record.granted) return 'revoked';
  return record.policyVersion === version ? 'granted' : 'policy-changed';
}

export type AiConsentService = ReturnType<typeof createAiConsentService>;

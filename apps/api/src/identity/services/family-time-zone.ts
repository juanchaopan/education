import {
  canonicalTimeZone,
  type FamilyTimeZone,
  type FamilyTimeZoneChange,
  type FamilyTimeZoneSetting,
} from '@education/contracts';
import {
  readFamilyTimeZone,
  saveFamilyTimeZone,
} from '../repositories/postgres-family-time-zone.js';
import type { Credentials, ParentTransaction } from './parent-transaction.js';
import { RequestError } from '../../shared/request-error.js';

// The zone of the family a session token belongs to, a parent's or a child's,
// null while the family has none; it rejects a token without a session.
export type SessionTimeZone = (token: string | undefined) => Promise<string | null>;

// A family without a zone of its own counts its days in the deployment's
// default zone, and says so, until a parent's device fills it in.
export function createFamilyTimeZoneService(
  transaction: ParentTransaction,
  sessionTimeZone: SessionTimeZone,
  defaultTimeZone: string,
) {
  return {
    read: (credentials: Credentials): Promise<FamilyTimeZoneSetting> =>
      transaction(credentials, async (client, parent) => {
        const zone = await readFamilyTimeZone(client, parent.familyId);
        return { timeZone: zone ?? defaultTimeZone, set: zone !== null };
      }),
    change: (
      credentials: Credentials,
      { timeZone, fill = false }: FamilyTimeZoneChange,
    ): Promise<FamilyTimeZoneSetting> => {
      const zone = canonicalTimeZone(timeZone);
      if (!zone) throw new RequestError(400, '没有找到这个时区，请重新选择。');
      return transaction(credentials, async (client, parent) => ({
        timeZone: await saveFamilyTimeZone(client, parent.familyId, zone, fill),
        set: true,
      }));
    },
    forSession: async (token: string | undefined): Promise<FamilyTimeZone> => ({
      timeZone: (await sessionTimeZone(token)) ?? defaultTimeZone,
    }),
  };
}

export type FamilyTimeZoneService = ReturnType<typeof createFamilyTimeZoneService>;

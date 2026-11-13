import { useQuery } from '@tanstack/react-query';
import { Value } from '@sinclair/typebox/value';
import { FamilyTimeZone } from '@education/contracts';
import { familyTimeZoneStorage, storedTimeZone } from './day-night';

export const familyTimeZoneKey = ['family-time-zone'];

// Keeps the family's time zone on this device for the first paint of the next
// visit. Storage a browser refuses only costs that first paint.
export function rememberTimeZone(timeZone: string) {
  try {
    localStorage.setItem(familyTimeZoneStorage, timeZone);
  } catch {
    // The open page still follows the zone it holds.
  }
}

// The zone of the signed-in parent's or child's family, or null when nobody
// is signed in on this device.
async function readFamilyTimeZone() {
  const response = await fetch('/api/v1/family/time-zone', {
    credentials: 'same-origin',
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
  });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error('暂时无法读取家庭时区。');
  const data: unknown = await response.json();
  if (!Value.Check(FamilyTimeZone, data)) throw new Error('暂时无法读取家庭时区。');
  rememberTimeZone(data.timeZone);
  return data.timeZone;
}

// The time zone the family's pages follow for day and night: the signed-in
// family's, else the one this device last kept, else none, which leaves the
// device's own clock in charge. Signing in or out reads it again.
export function useFamilyTimeZone(): string | undefined {
  const { data } = useQuery({
    queryKey: familyTimeZoneKey,
    queryFn: readFamilyTimeZone,
    retry: false,
    staleTime: Infinity,
  });
  return data ?? storedTimeZone(familyTimeZoneStorage);
}

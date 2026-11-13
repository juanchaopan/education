import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Value } from '@sinclair/typebox/value';
import { FamilyTimeZoneSetting, type FamilyTimeZoneChange } from '@education/contracts';
import { deviceTimeZone } from '../../../shared/lib/device-time-zone';
import { familyTimeZoneKey, rememberTimeZone } from '../../../shared/lib/useFamilyTimeZone';
import { sessionRead, sessionRequest } from './session-request';

const path = 'parents/family/time-zone';
const settingKey = (csrf: string) => ['parent-family-time-zone', csrf];
const reading = {
  failed: '暂时无法读取家庭时区，请重试。',
  401: '登录状态已失效，请重新登录家长账号。',
};

// Saves a change and gives back the zone the family has afterwards.
async function saveTimeZone(csrf: string, change: FamilyTimeZoneChange) {
  const failed = () => new Error('没保存上，再点一次。');
  const response = await sessionRequest(path, change, csrf, 10_000, 'PUT').catch(() => {
    throw failed();
  });
  if (!response.ok) throw failed();
  const data: unknown = await response.json().catch(() => null);
  if (!Value.Check(FamilyTimeZoneSetting, data)) throw failed();
  return data;
}

export function useFamilyTimeZoneSetting(csrf: string) {
  return useQuery({
    queryKey: settingKey(csrf),
    queryFn: () => sessionRead(path, FamilyTimeZoneSetting, reading, csrf),
    retry: false,
  });
}

// Saving a zone also hands the zone the family now has to the pages' day and
// night and to this device, so the theme follows the new clock at once; the
// server's spelling of the zone is the one kept.
export function useChangeFamilyTimeZone(csrf: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (change: FamilyTimeZoneChange) => saveTimeZone(csrf, change),
    retry: false,
    onSuccess: (saved) => {
      client.setQueryData(settingKey(csrf), saved);
      client.setQueryData(familyTimeZoneKey, saved.timeZone);
      rememberTimeZone(saved.timeZone);
    },
  });
}

// The clock a browser reports when it hides where it is, which says nothing
// about the family's day.
const hiddenClock = /^(Etc\/)?(UTC|GMT)$/;

// A family that has no zone of its own yet takes this device's the first time
// a parent opens the parent space on it. The fill leaves alone a zone another
// parent's device saved meanwhile. A fill that did not go through is tried
// again when the space opens again or the session renews; the family
// meanwhile counts its days in the default zone.
export function useFillFamilyTimeZone(csrf: string) {
  const setting = useFamilyTimeZoneSetting(csrf);
  const { mutate } = useChangeFamilyTimeZone(csrf);
  const tried = useRef(false);
  const unset = setting.data?.set === false;
  useEffect(() => {
    const device = deviceTimeZone();
    if (!unset || !device || hiddenClock.test(device) || tried.current) return;
    tried.current = true;
    mutate(
      { timeZone: device, fill: true },
      {
        onError: () => {
          tried.current = false;
        },
      },
    );
  }, [unset, mutate]);
}

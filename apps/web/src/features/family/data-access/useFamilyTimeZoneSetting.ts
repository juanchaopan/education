import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Value } from '@sinclair/typebox/value';
import { FamilyTimeZoneSetting } from '@education/contracts';
import { deviceTimeZone } from '../../../shared/lib/device-time-zone';
import { familyTimeZoneKey, rememberTimeZone } from '../../../shared/lib/useFamilyTimeZone';
import { sessionRequest } from './session-request';

const path = 'parents/family/time-zone';
const unavailable = '暂时无法读取家庭时区，请重试。';
const settingKey = (csrf: string) => ['parent-family-time-zone', csrf];

async function readSetting(csrf: string) {
  const response = await sessionRequest(path, undefined, csrf).catch(() => {
    throw new Error(unavailable);
  });
  if (response.status === 401) throw new Error('登录状态已失效，请重新登录家长账号。');
  if (!response.ok) throw new Error(unavailable);
  const data: unknown = await response.json().catch(() => null);
  if (!Value.Check(FamilyTimeZoneSetting, data)) throw new Error(unavailable);
  return data;
}

async function saveTimeZone(csrf: string, timeZone: string) {
  const response = await sessionRequest(path, { timeZone }, csrf, 10_000, 'PUT').catch(() => {
    throw new Error('没保存上，再点一次。');
  });
  if (response.status !== 204) throw new Error('没保存上，再点一次。');
}

export function useFamilyTimeZoneSetting(csrf: string) {
  return useQuery({ queryKey: settingKey(csrf), queryFn: () => readSetting(csrf), retry: false });
}

// Saving a zone also hands it to the pages' day and night and to this
// device, so the theme follows the new clock at once.
export function useChangeFamilyTimeZone(csrf: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (timeZone: string) => saveTimeZone(csrf, timeZone),
    retry: false,
    onSuccess: (_result, timeZone) => {
      client.setQueryData(settingKey(csrf), { timeZone, set: true });
      client.setQueryData(familyTimeZoneKey, timeZone);
      rememberTimeZone(timeZone);
    },
  });
}

// A family that has no zone of its own yet takes this device's, once, the
// first time a parent opens the parent space on it. A failure is left for
// the next visit; the family meanwhile counts its days in the default zone.
export function useFillFamilyTimeZone(csrf: string) {
  const setting = useFamilyTimeZoneSetting(csrf);
  const { mutate } = useChangeFamilyTimeZone(csrf);
  const tried = useRef(false);
  const unset = setting.data?.set === false;
  useEffect(() => {
    const device = deviceTimeZone();
    if (!unset || !device || tried.current) return;
    tried.current = true;
    mutate(device);
  }, [unset, mutate]);
}

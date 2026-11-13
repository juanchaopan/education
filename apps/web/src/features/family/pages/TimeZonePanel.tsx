import { useMemo, useState } from 'react';
import { deviceTimeZone } from '../../../shared/lib/device-time-zone';
import { TimeZoneCard, type SaveState } from '../components/TimeZoneCard';
import { zoneOptions } from '../components/time-zone-names';
import {
  useChangeFamilyTimeZone,
  useFamilyTimeZoneSetting,
} from '../data-access/useFamilyTimeZoneSetting';

// How the card shows each state of saving the family's choice.
const saveStates = {
  idle: 'idle',
  pending: 'saving',
  error: 'failed',
  success: 'saved',
} as const satisfies Record<string, SaveState>;

// Every zone the browser knows, with the family's and the device's own in
// case the browser lists them under another name.
function knownZones(...more: (string | undefined)[]) {
  return [...Intl.supportedValuesOf('timeZone'), ...more.filter((zone) => zone !== undefined)];
}

// The family's time zone on the 「家庭」 page. The list keeps the parent's
// choice until it is saved; a saved choice becomes the family's zone. The
// times shown are those of the moment the page opened.
export function TimeZonePanel({ csrf }: { csrf: string }) {
  const setting = useFamilyTimeZoneSetting(csrf);
  const change = useChangeFamilyTimeZone(csrf);
  const [choice, setChoice] = useState<string>();
  const [now] = useState(() => new Date());
  const device = deviceTimeZone();
  const current = setting.data?.timeZone;
  const options = useMemo(
    () => zoneOptions(knownZones(current, device), now),
    [current, device, now],
  );
  return (
    <TimeZoneCard
      current={current}
      choice={choice ?? current}
      device={device}
      options={options}
      now={now}
      loading={setting.isPending}
      failed={setting.isError}
      save={saveStates[change.status]}
      onChoose={(zone) => {
        change.reset();
        setChoice(zone);
      }}
      onSave={() => {
        if (choice && choice !== current) change.mutate(choice);
      }}
      onRetry={() => void setting.refetch()}
    />
  );
}

import { Actions } from '../../../shared/ui/Actions';
import { Button } from '../../../shared/ui/Button';
import { Loading } from '../../../shared/ui/Loading';
import { Notice } from '../../../shared/ui/Notice';
import { SelectField } from '../../../shared/ui/SelectField';
import { ParentCard } from './ParentCard';
import { StatusBadge } from './StatusBadge';
import { zoneClock, zoneName, type ZoneOption } from './time-zone-names';
import styles from './TimeZoneCard.module.css';

export type SaveState = 'idle' | 'saving' | 'saved' | 'failed';

export type TimeZoneCardProps = {
  // The family's zone as saved, the one chosen in the list, and the zone this
  // device's clock is set to.
  current?: string;
  choice?: string;
  device?: string;
  options: readonly ZoneOption[];
  now: Date;
  loading?: boolean;
  failed?: boolean;
  save: SaveState;
  onChoose: (zone: string) => void;
  onSave: () => void;
  onRetry: () => void;
};

// The family's time zone: its name, the time there, why it matters, and the
// list to change it. A device set to another zone offers its own, as the
// parent may have moved or be travelling.
export function TimeZoneCard(props: TimeZoneCardProps) {
  const { current, loading, failed, save, onRetry } = props;
  return (
    <ParentCard
      titleId="time-zone-title"
      icon="clock"
      title="家庭时区"
      action={
        save === 'saved' && (
          <StatusBadge tone="ok" live>
            已保存
          </StatusBadge>
        )
      }
    >
      {loading && <Loading label="正在读取家庭时区…" />}
      {failed && (
        <Actions>
          <Notice tone="error">家庭时区没有读出来。</Notice>
          <Button variant="secondary" onClick={onRetry}>
            重试
          </Button>
        </Actions>
      )}
      {current && <ZoneSetting {...props} current={current} />}
    </ParentCard>
  );
}

function ZoneSetting({
  current,
  choice = current,
  device,
  options,
  now,
  save,
  onChoose,
  onSave,
}: TimeZoneCardProps & { current: string }) {
  const clock = zoneClock(current, now);
  const saving = save === 'saving';
  return (
    <>
      <p className={styles.current}>
        <span className={styles.name}>{zoneName(current, now)}</span>
        <span className={styles.clock}>
          现在 {clock.time} · {clock.part}
        </span>
      </p>
      <p className={styles.why}>
        每天的学习从这个时区的 0 点算起，家里每个人的页面也按它的时间换白天和晚上的样子。
      </p>
      {device && device !== current && (
        <DeviceZone device={device} now={now} disabled={saving} onChoose={onChoose} />
      )}
      <div className={styles.field}>
        <SelectField
          id="family-time-zone"
          label="时区"
          value={choice}
          disabled={saving}
          onChange={(event) => onChoose(event.target.value)}
        >
          {options.map(({ zone, label }) => (
            <option key={zone} value={zone}>
              {label}
            </option>
          ))}
        </SelectField>
      </div>
      <div className={styles.save}>
        <Button aria-busy={saving} disabled={saving || choice === current} onClick={onSave}>
          {saving ? '正在保存…' : '保存'}
        </Button>
        {save === 'failed' && (
          <p role="alert" className={styles.failed}>
            没保存上，再点一次。
          </p>
        )}
      </div>
    </>
  );
}

function DeviceZone({
  device,
  now,
  disabled,
  onChoose,
}: {
  device: string;
  now: Date;
  disabled: boolean;
  onChoose: (zone: string) => void;
}) {
  const name = zoneName(device, now);
  return (
    <div className={styles.device}>
      <p>
        这台设备在{name}，现在 {zoneClock(device, now).time}。
      </p>
      <Button variant="secondary" disabled={disabled} onClick={() => onChoose(device)}>
        改成{name}
      </Button>
    </div>
  );
}

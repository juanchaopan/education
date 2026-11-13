import { addUpDays, type CalendarDate, type StudyDay } from '@education/contracts';
import { Avatar } from '../../../shared/ui/Avatar';
import { Button } from '../../../shared/ui/Button';
import { Card } from '../../../shared/ui/Card';
import { Icon } from '../../../shared/ui/Icon';
import { Spoken } from '../../../shared/ui/Spoken';
import { StandaloneLink } from '../../../shared/ui/StandaloneLink';
import { DayChart, type DayChartProps } from './DayChart';
import { MinutesPill } from './MinutesPill';
import { ProblemsBar } from './ProblemsBar';
import { longDate, rangeName } from './study-day-text';
import styles from './ChildDayCard.module.css';

export type ChildDayCardProps = Omit<DayChartProps, 'days' | 'today'> & {
  childId: string;
  nickname: string;
  // The child's place in the family's list, which picks the avatar's colour.
  place: number;
  // The seven days shown and the family's today, or none while they are read
  // or could not be.
  days?: readonly StudyDay[];
  today?: CalendarDate;
  failed?: boolean;
  onRetry: () => void;
  // Where 「看学习记录」 leads: the child's record for the days in view.
  record: string;
};

// One child at a glance: the minutes of the days in view as a chart that
// also picks a day, then the minutes and the problems of those days, or of
// the picked day, and the way to the record of the same days. Finishing after
// help never counts as finishing alone.
export function ChildDayCard(props: ChildDayCardProps) {
  const { childId, nickname, place, days, today, failed, onRetry, record } = props;
  const titleId = `child-days-${childId}`;
  return (
    <Card aria-labelledby={titleId} className={styles.card}>
      <h2 id={titleId} className={styles.name}>
        <Avatar name={nickname} place={place} />
        <span className={styles.nickname}>{nickname}</span>
      </h2>
      {failed ? (
        <p role="alert" className={styles.failed}>
          学习记录没有读出来。
          <Button variant="text" onClick={onRetry}>
            重试
          </Button>
        </p>
      ) : days && today ? (
        <ShownDays {...props} days={days} today={today} />
      ) : (
        <Reading nickname={nickname} />
      )}
      {!failed && (
        <div className={styles.record}>
          <StandaloneLink to={record}>
            <Icon name="chart" />
            看学习记录
          </StandaloneLink>
        </div>
      )}
    </Card>
  );
}

function ShownDays(props: ChildDayCardProps & { days: readonly StudyDay[]; today: CalendarDate }) {
  const { days, today, picked } = props;
  const chosen = picked ? days.filter(({ date }) => date === picked) : days;
  const { seconds, problems } = addUpDays(chosen);
  const range = rangeName(days[0]!.date, days.at(-1)!.date, today);
  return (
    <>
      <DayChart {...props} days={days} />
      <MinutesPill days={picked ? longDate(picked) : range} seconds={seconds} />
      <ProblemsBar counts={problems} empty={picked ? '这一天没有做题' : '没有做题'} />
    </>
  );
}

// Grey shapes where the chart, the minutes and the problems will be.
function Reading({ nickname }: { nickname: string }) {
  return (
    <div className={styles.reading} role="status">
      <span className={styles.shape} data-shape="chart" />
      <span className={styles.shape} data-shape="pill" />
      <span className={styles.shape} data-shape="bar" />
      <Spoken>正在读取{nickname}的学习记录…</Spoken>
    </div>
  );
}

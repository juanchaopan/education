import type { CalendarDate, LearningRange, ProblemState } from '@education/contracts';
import { Button } from '../../../shared/ui/Button';
import { Loading } from '../../../shared/ui/Loading';
import { Notice } from '../../../shared/ui/Notice';
import { MinutesPill } from './MinutesPill';
import { ParentCard } from './ParentCard';
import { ProblemsBar } from './ProblemsBar';
import { longDate, rangeName, weekdayName } from './study-day-text';
import styles from './LearningRangeCard.module.css';

type Props = {
  from: CalendarDate;
  to: CalendarDate;
  today: CalendarDate;
  range?: LearningRange;
  loading?: boolean;
  failed?: boolean;
  onRetry: () => void;
  // Looking at one day, the way to the seven days that end on it.
  onSevenDays: () => void;
};

const stateNames: Record<ProblemState, string> = {
  independent: '独立完成',
  assisted: '提示后完成',
  open: '还没做出来',
};

// A child's learning over the days chosen on the overview: the minutes, the
// problems each counted once in its best state, and every problem tried with
// how often it was answered and helped with.
export function LearningRangeCard({
  from,
  to,
  today,
  range,
  loading,
  failed,
  onRetry,
  onSevenDays,
}: Props) {
  const oneDay = from === to;
  return (
    <ParentCard
      titleId="learning-range-title"
      icon="calendar"
      title={oneDay ? `${longDate(from)} ${weekdayName(from)}` : rangeName(from, to, today)}
      action={
        oneDay && (
          <Button variant="secondary" onClick={onSevenDays}>
            看这 7 天
          </Button>
        )
      }
    >
      {loading && <Loading label="正在读取这段时间的学习记录…" />}
      {failed && (
        <div className={styles.failed}>
          <Notice tone="error">这段时间的学习记录没有读出来。</Notice>
          <Button variant="secondary" onClick={onRetry}>
            重试
          </Button>
        </div>
      )}
      {range && (
        <div className={styles.body}>
          <MinutesPill seconds={range.seconds} />
          <ProblemsBar counts={range.problems} empty={oneDay ? '这一天没有做题' : '没有做题'} />
          {range.items.length > 0 && (
            <ul className={styles.items}>
              {range.items.map((item) => (
                <li key={item.id} className={styles.item}>
                  <span className={styles.text}>
                    <span className={styles.title}>{item.title ?? item.id}</span>
                    <span className={styles.detail}>
                      作答 {item.attempts} 次 · 提示 {item.hints} 次
                    </span>
                  </span>
                  <span className={styles.state} data-state={item.state}>
                    {stateNames[item.state]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </ParentCard>
  );
}

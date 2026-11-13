import { useRef, type PointerEvent } from 'react';
import type { CalendarDate, StudyDay } from '@education/contracts';
import { IconButton } from '../../../shared/ui/IconButton';
import { columnLabel, spokenDay } from './study-day-text';
import styles from './DayChart.module.css';

export type DayChartProps = {
  // The seven days shown, the earliest first.
  days: readonly StudyDay[];
  today: CalendarDate;
  picked?: CalendarDate;
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onForward: () => void;
  onPick: (date: CalendarDate) => void;
};

// How far a finger must travel sideways to count as a swipe, in pixels.
const swipe = 40;

// Seven columns of the minutes studied each day, the tallest day filling the
// height. Every column is a toggle for its whole height, so a day without a
// bar is as easy to pick. Today's bar has the accent colour; a picked day
// stands out and the others fade. The round buttons beside it, or a swipe on
// a touch screen, move the days one at a time.
export function DayChart({
  days,
  today,
  picked,
  canGoBack,
  canGoForward,
  onBack,
  onForward,
  onPick,
}: DayChartProps) {
  const start = useRef<number | undefined>(undefined);
  const most = Math.max(...days.map(({ seconds }) => seconds));
  const swiped = (event: PointerEvent) => {
    if (start.current === undefined) return;
    const travel = event.clientX - start.current;
    start.current = undefined;
    if (travel > swipe && canGoBack) onBack();
    if (travel < -swipe && canGoForward) onForward();
  };
  return (
    <div className={styles.chart}>
      {most === 0 && <p className={styles.quiet}>这几天没有学习</p>}
      <div className={styles.side}>
        <IconButton icon="back" label="往前看一天" disabled={!canGoBack} onClick={onBack} />
      </div>
      <div
        className={styles.days}
        data-picked={picked !== undefined || undefined}
        onPointerDown={(event) => {
          if (event.pointerType === 'touch') start.current = event.clientX;
        }}
        onPointerUp={swiped}
        onPointerCancel={() => (start.current = undefined)}
      >
        {days.map(({ date, seconds }) => (
          <button
            key={date}
            type="button"
            className={styles.day}
            aria-pressed={picked === date}
            aria-label={spokenDay(date, seconds)}
            data-today={date === today || undefined}
            onClick={() => onPick(date)}
          >
            <span className={styles.room} aria-hidden="true">
              <span
                className={styles.bar}
                data-empty={seconds === 0 || undefined}
                style={{ blockSize: most ? `${(seconds / most) * 100}%` : undefined }}
              />
            </span>
            <span className={styles.label} aria-hidden="true">
              {columnLabel(date, today)}
            </span>
          </button>
        ))}
      </div>
      <div className={styles.side}>
        {canGoForward && <IconButton icon="chevron" label="往后看一天" onClick={onForward} />}
      </div>
    </div>
  );
}

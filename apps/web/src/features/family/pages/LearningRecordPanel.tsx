import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  learningSummaryPageSize,
  localDate,
  type CalendarDate,
  type ChildAccess,
} from '@education/contracts';
import { deviceTimeZone } from '../../../shared/lib/device-time-zone';
import { Actions } from '../../../shared/ui/Actions';
import { Avatar } from '../../../shared/ui/Avatar';
import { Button } from '../../../shared/ui/Button';
import { Loading } from '../../../shared/ui/Loading';
import { LearningRangeCard } from '../components/LearningRangeCard';
import { LearningSummaryList } from '../components/LearningSummaryList';
import { ParentCard } from '../components/ParentCard';
import { RecordTotal } from '../components/RecordTotal';
import { ShelfChoices } from '../components/ShelfChoices';
import { useFamilyChildren } from '../data-access/useChildAccess';
import { useFamilyTimeZoneSetting } from '../data-access/useFamilyTimeZoneSetting';
import { useLearningRange, useLearningSummary } from '../data-access/useLearningSummary';
import { chosenDays, sevenDaysEnding } from '../day-window';
import styles from '../components/LearningSummary.module.css';

// One child's learning record: the days chosen, which the overview's card
// names in the address with ?child=, &from= and &to=, then the summary of
// every problem with the whole record's totals. Without days in the address
// it opens on today and the six days before it, in the family's time zone,
// or this device's when the family's cannot be read.
export function LearningRecordPanel({ csrf }: { csrf: string }) {
  const family = useFamilyChildren(csrf);
  const zone = useFamilyTimeZoneSetting(csrf);
  const [opened] = useState(() => new Date());
  if (family.isPending || zone.isPending) return <Loading label="正在加载学习记录…" />;
  if (family.isError)
    return (
      <>
        <p role="alert">暂时无法加载孩子列表。</p>
        <Button onClick={() => void family.refetch()}>刷新孩子列表</Button>
      </>
    );
  const { children } = family.data;
  if (!children.length) return <p>关联孩子账号后，可以在这里查看学习记录。</p>;
  const timeZone = zone.data?.timeZone ?? deviceTimeZone() ?? 'UTC';
  const today = localDate(timeZone, opened);
  return <ChildRecord csrf={csrf} family={children} today={today} />;
}

function ChildRecord({
  csrf,
  family,
  today,
}: {
  csrf: string;
  family: readonly ChildAccess[];
  today: CalendarDate;
}) {
  const [search, setSearch] = useSearchParams();
  const asked = search.get('child');
  const childId = family.some(({ id }) => id === asked) ? asked! : family[0]!.id;
  const { from, to } = chosenDays(search.get('from'), search.get('to'), today);
  const range = useLearningRange(csrf, childId, from, to);
  const show = (child: string, days: { from: CalendarDate; to: CalendarDate }) =>
    setSearch({ child, ...days });
  return (
    <>
      <div className={styles.children}>
        <ShelfChoices
          legend="孩子"
          name="learning-child"
          look="pill"
          value={childId}
          choices={family.map((child, place) => ({
            value: child.id,
            label: child.nickname,
            mark: <Avatar name={child.nickname} place={place} />,
          }))}
          onChange={(child) => show(child, { from, to })}
        />
      </div>
      <LearningRangeCard
        from={from}
        to={to}
        today={today}
        range={range.data}
        loading={range.isPending}
        failed={range.isError}
        onRetry={() => void range.refetch()}
        onSevenDays={() => show(childId, sevenDaysEnding(to))}
      />
      <ParentCard titleId="learning-summary-title" icon="chart" title="学习摘要">
        {range.data && <RecordTotal {...range.data.total} />}
        <SummaryPages key={childId} csrf={csrf} childId={childId} />
      </ParentCard>
    </>
  );
}

// The summary of every problem the child has a record of, a page at a time.
function SummaryPages({ csrf, childId }: { csrf: string; childId: string }) {
  const [offset, setOffset] = useState(0);
  const summary = useLearningSummary(csrf, childId, offset);
  return (
    <>
      {summary.isPending && <Loading label="正在加载学习摘要…" />}
      {summary.isError && <p role="alert">{summary.error.message}</p>}
      {summary.isSuccess && <LearningSummaryList problems={summary.data.problems} />}
      <Actions>
        {offset > 0 && (
          <Button variant="secondary" onClick={() => setOffset(offset - learningSummaryPageSize)}>
            上一页
          </Button>
        )}
        {summary.isSuccess && summary.data.hasMore && (
          <Button variant="secondary" onClick={() => setOffset(offset + learningSummaryPageSize)}>
            下一页
          </Button>
        )}
        <Button variant="text" disabled={summary.isFetching} onClick={() => void summary.refetch()}>
          刷新学习记录
        </Button>
      </Actions>
    </>
  );
}

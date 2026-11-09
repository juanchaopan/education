import { useState } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import type { ChildAccess, PracticePage } from '@education/contracts';
import { problemPath } from '../../../shared/lib/problem-path';
import { Button } from '../../../shared/ui/Button';
import { Hint } from '../../../shared/ui/Hint';
import { Icon } from '../../../shared/ui/Icon';
import { IconLink } from '../../../shared/ui/IconLink';
import { Loading } from '../../../shared/ui/Loading';
import { Notice } from '../../../shared/ui/Notice';
import { StandaloneLink } from '../../../shared/ui/StandaloneLink';
import { ParentCard } from '../components/ParentCard';
import { ProblemRows, type ProblemRow } from '../components/ProblemRows';
import type { ChildRecord } from '../data-access/useLearningSummary';
import { useAssignPractice } from '../data-access/usePractice';

type Records = readonly UseQueryResult<ChildRecord>[];
type Practice = readonly UseQueryResult<PracticePage>[];
type Family = readonly ChildAccess[];

// The overview shows the first few planned problems; the practice page has
// them all.
const shownPlanned = 5;

const planned = (page: PracticePage | undefined, id: string, version: number) =>
  !!page?.problems.some((problem) => problem.id === id && problem.version === version);

// Problems a child answered wrongly and has not yet finished alone, as the
// learning summary marks them, each with a button to plan it as practice. A
// problem already planned says so instead.
export function ReviewIdeas({
  csrf,
  family,
  records,
  practice,
}: {
  csrf: string;
  family: Family;
  records: Records;
  practice: Practice;
}) {
  const assign = useAssignPractice(csrf);
  const [done, setDone] = useState<string[]>([]);
  const rows: ProblemRow[] = family.flatMap((child, place) =>
    (records[place]?.data?.problems ?? []).flatMap(
      ({ id, version, title, incorrect, reviewSuggested }) => {
        if (!reviewSuggested || title === null) return [];
        const key = `${child.id}/${problemPath(id, version)}`;
        const already = done.includes(key) || planned(practice[place]?.data, id, version);
        const plan = () =>
          assign.mutate(
            { childId: child.id, problem: { id, version } },
            { onSuccess: () => setDone((keys) => [...keys, key]) },
          );
        return {
          key,
          title,
          detail: `${child.nickname} · 答错 ${incorrect} 次`,
          action: already ? (
            <span role="status">已安排</span>
          ) : (
            <Button
              variant="secondary"
              aria-label={`为${child.nickname}安排“${title}”`}
              disabled={assign.isPending}
              onClick={plan}
            >
              <Icon name="plus" />
              安排
            </Button>
          ),
        };
      },
    ),
  );
  const reading = records.some((record) => record.isPending);
  return (
    <ParentCard titleId="review-ideas-title" icon="bulb" title="值得再练">
      <Hint>答错过、还没有独立完成的题。</Hint>
      {reading && <Loading label="正在读取学习记录…" />}
      {!reading && !rows.length && <p>暂时没有。</p>}
      <ProblemRows icon="bulb" rows={rows} />
      {assign.isError && <Notice tone="error">{assign.error.message}</Notice>}
    </ParentCard>
  );
}

// The practice planned for each child, the first few of them.
export function AssignedPractice({ family, practice }: { family: Family; practice: Practice }) {
  const rows: ProblemRow[] = family.flatMap((child, place) =>
    (practice[place]?.data?.problems ?? []).map(({ id, version, title }) => ({
      key: `${child.id}/${problemPath(id, version)}`,
      title: title ?? '这道题暂时不可用',
      detail: child.nickname,
    })),
  );
  const reading = practice.some((page) => page.isPending);
  const failed = practice.some((page) => page.isError);
  return (
    <ParentCard
      titleId="assigned-practice-title"
      icon="calendar"
      title="已安排"
      action={<IconLink to="/family/practice" icon="plus" label="安排练习" />}
    >
      {reading && <Loading label="正在读取练习安排…" />}
      {failed && <Notice tone="error">有的练习安排没有读出来，请刷新页面。</Notice>}
      {!reading && !failed && !rows.length && <p>还没有安排练习。</p>}
      <ProblemRows icon="calendar" rows={rows.slice(0, shownPlanned)} />
      {rows.length > shownPlanned && (
        <StandaloneLink to="/family/practice">查看全部练习</StandaloneLink>
      )}
    </ParentCard>
  );
}

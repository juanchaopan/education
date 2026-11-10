import type { UseQueryResult } from '@tanstack/react-query';
import type { ChildAccess, PracticePage, ProblemLearningSummary } from '@education/contracts';
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
import { useAssignPractice, type PracticeAssignment } from '../data-access/usePractice';

// A child with its learning record and its first page of practice, as the
// overview reads them.
export type ChildActivity = {
  child: ChildAccess;
  record: UseQueryResult<ChildRecord>;
  practice: UseQueryResult<PracticePage>;
};

// The overview shows the first few planned problems; the practice page has
// them all.
const shownPlanned = 5;

const sameProblem = (problem: { id: string; version: number }, id: string, version: number) =>
  problem.id === id && problem.version === version;

// Problems a child answered wrongly and has not yet finished alone, as the
// learning summary marks them, each with a button to plan it as practice. A
// problem the practice already holds, or that was just planned, says so
// instead; the practice is read again after each plan. A record that could
// not be read is said to have failed rather than to hold nothing.
export function ReviewIdeas({
  csrf,
  activity,
}: {
  csrf: string;
  activity: readonly ChildActivity[];
}) {
  const assign = useAssignPractice(csrf);
  const justPlanned = (childId: string, id: string, version: number) =>
    assign.isSuccess &&
    assign.variables.childId === childId &&
    sameProblem(assign.variables.problem, id, version);
  const rows: ProblemRow[] = activity.flatMap(({ child, record, practice }) =>
    (record.data?.problems ?? []).flatMap(
      ({ id, version, title, incorrect, reviewSuggested }: ProblemLearningSummary) => {
        if (!reviewSuggested || title === null) return [];
        const planned =
          justPlanned(child.id, id, version) ||
          !!practice.data?.problems.some((problem) => sameProblem(problem, id, version));
        const plan: PracticeAssignment = { childId: child.id, problem: { id, version } };
        return {
          key: `${child.id}/${problemPath(id, version)}`,
          title,
          detail: `${child.nickname} · 答错 ${incorrect} 次`,
          action: planned ? (
            <span role="status">已安排</span>
          ) : (
            <Button
              variant="secondary"
              aria-label={`为${child.nickname}安排“${title}”`}
              disabled={assign.isPending}
              onClick={() => assign.mutate(plan)}
            >
              <Icon name="plus" />
              安排
            </Button>
          ),
        };
      },
    ),
  );
  const reading = activity.some(({ record }) => record.isPending);
  const failed = activity.some(({ record }) => record.isError);
  return (
    <ParentCard titleId="review-ideas-title" icon="bulb" title="值得再练">
      <Hint>答错过、还没有独立完成的题。</Hint>
      {reading && <Loading label="正在读取学习记录…" />}
      {failed && <Notice tone="error">有的学习记录没有读出来，请刷新页面。</Notice>}
      {!reading && !failed && !rows.length && <p>暂时没有。</p>}
      <ProblemRows icon="bulb" rows={rows} />
      {assign.isError && <Notice tone="error">{assign.error.message}</Notice>}
    </ParentCard>
  );
}

// Each child's planned problems as rows, taken in turn one child at a time,
// so the first few shown include every child's practice rather than all of
// one child's.
function plannedInTurn(activity: readonly ChildActivity[]): ProblemRow[] {
  const lists = activity.map(({ child, practice }) =>
    (practice.data?.problems ?? []).map(({ id, version, title }) => ({
      key: `${child.id}/${problemPath(id, version)}`,
      title: title ?? '这道题暂时不可用',
      detail: child.nickname,
    })),
  );
  const longest = Math.max(0, ...lists.map((list) => list.length));
  return Array.from({ length: longest }, (_, turn) =>
    lists.flatMap((list) => list.slice(turn, turn + 1)),
  ).flat();
}

// The practice planned for the children, the first few of them.
export function AssignedPractice({ activity }: { activity: readonly ChildActivity[] }) {
  const rows = plannedInTurn(activity);
  const reading = activity.some(({ practice }) => practice.isPending);
  const failed = activity.some(({ practice }) => practice.isError);
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

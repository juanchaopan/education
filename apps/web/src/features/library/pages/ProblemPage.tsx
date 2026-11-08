import { Fragment, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import type { ProblemSummary } from '@education/contracts';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { StandaloneLink } from '../../../shared/ui/StandaloneLink';
import { useProblem } from '../data-access/useProblem';
import { catalogPath } from '../model';
import { problemPath } from '../../../shared/lib/problem-path';

// Each problem version's own page, keyed by problemPath. The app shell supplies
// them, so a page can come from whichever feature teaches it.
export type ProblemPages = ReadonlyMap<string, (problem: ProblemSummary) => ReactNode>;

export function ProblemPage({ pages }: { pages: ProblemPages }) {
  const { id = '', version = '' } = useParams();
  const query = useProblem(id, version);
  const problem = query.data;
  return (
    <section aria-label="题目">
      <StandaloneLink to={problem ? catalogPath(problem) : '/'}>返回题库</StandaloneLink>
      {query.isPending && (
        <EmptyState icon="waiting" title="正在打开这道题" description="请稍等一下。" />
      )}
      {query.isError && (
        <EmptyState
          icon="cloud"
          title="刚才没能打开这道题"
          description="可以再试一次。"
          actionLabel="再试一次"
          onAction={() => {
            void query.refetch();
          }}
        />
      )}
      {query.isSuccess && <ProblemContent problem={query.data} pages={pages} />}
    </section>
  );
}

function ProblemContent({
  problem,
  pages,
}: {
  problem: ProblemSummary | null;
  pages: ProblemPages;
}) {
  if (problem) {
    const path = problemPath(problem.id, problem.version);
    const renderPage = pages.get(path);
    if (renderPage) return <Fragment key={path}>{renderPage(problem)}</Fragment>;
  }
  return (
    <EmptyState
      icon="flower"
      title="这道题暂时不可用"
      description="这个题目或版本目前无法打开。可以返回题库，选一道其他题目。"
    />
  );
}

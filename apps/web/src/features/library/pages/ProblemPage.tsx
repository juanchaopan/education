import { Fragment } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { ProblemSummary } from '@education/contracts';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { useProblem } from '../data-access/useProblem';
import { catalogPath, problemPath } from '../model';
import { problemPages, type ProblemPages } from './problem-pages';

export function ProblemPage({ pages = problemPages }: { pages?: ProblemPages }) {
  const { id = '', version = '' } = useParams();
  const query = useProblem(id, version);
  const problem = query.data;
  return (
    <section aria-label="题目">
      <Link to={problem ? catalogPath(problem) : '/'}>返回题库</Link>
      {query.isPending && <EmptyState icon="◌" title="正在打开这道题" description="请稍等一下。" />}
      {query.isError && (
        <EmptyState
          icon="☁"
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
      icon="✿"
      title="这道题暂时不可用"
      description="这个题目或版本目前无法打开。可以返回题库，选一道其他题目。"
    />
  );
}

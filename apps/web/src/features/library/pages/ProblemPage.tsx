import { Fragment, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import type { ProblemSummary } from '@education/contracts';
import { problemPath } from '../../../shared/lib/problem-path';
import { useLeave } from '../../../shared/lib/useLeave';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { FullscreenFrame } from '../../../shared/ui/FullscreenFrame';
import { useProblem } from '../data-access/useProblem';
import { catalogPath } from '../model';

// Each problem version's own page, keyed by problemPath. The app shell supplies
// them, so a page can come from whichever feature teaches it.
export type ProblemPages = ReadonlyMap<string, (problem: ProblemSummary) => ReactNode>;

// The full-screen frame and its way back. Leaving follows every write on its
// way to the server, such as each hint and answer, so only the frame redraws
// for them, never the problem's page it holds.
function LeavingFrame({ fallback, children }: { fallback: string; children: ReactNode }) {
  const back = useLeave(fallback);
  return (
    <FullscreenFrame waiting={back.waiting} onBack={back.leave}>
      {children}
    </FullscreenFrame>
  );
}

// A problem fills the screen. Its back button returns the child to the page
// they came from, or, for a link opened directly, to the problem's own
// category of the catalog; a problem that cannot be found goes back to the
// catalog as it first opens.
export function ProblemPage({ pages }: { pages: ProblemPages }) {
  const { id = '', version = '' } = useParams();
  const query = useProblem(id, version);
  const problem = query.data;
  return (
    <LeavingFrame fallback={problem ? catalogPath(problem) : '/'}>
      {query.isPending && (
        <EmptyState icon="clock" title="正在打开这道题" description="请稍等一下。" />
      )}
      {query.isError && (
        <EmptyState
          icon="alert"
          title="刚才没能打开这道题"
          description="可以再试一次。"
          actionLabel="再试一次"
          onAction={() => {
            void query.refetch();
          }}
        />
      )}
      {query.isSuccess && <ProblemContent problem={query.data} pages={pages} />}
    </LeavingFrame>
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
      icon="sprout"
      title="这道题暂时不可用"
      description="这个题目或版本目前无法打开。可以返回题库，选一道其他题目。"
    />
  );
}

import { Fragment, type ReactNode } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import type { ProblemSummary } from '@education/contracts';
import { problemPath, signInPath } from '../../../shared/lib/problem-path';
import { useLeave } from '../../../shared/lib/useLeave';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { FullscreenFrame } from '../../../shared/ui/FullscreenFrame';
import { ProblemNote } from '../components/ProblemNote';
import { useProblem } from '../data-access/useProblem';
import { homeOf, type NoteArt, type Viewer } from '../model';

// Each problem version's own page, keyed by problemPath. The app shell supplies
// them, so a page can come from whichever feature teaches it. A signed-in
// child's page is given the session's token, so the child's work is kept; a
// parent's page is given none, and keeps nothing.
export type ProblemPages = ReadonlyMap<
  string,
  (problem: ProblemSummary, csrf?: string) => ReactNode
>;

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

type Props = { pages: ProblemPages; viewer: Viewer; art: NoteArt };

// A problem fills the screen. Its back button returns to the page the viewer
// came from, or, for a link opened directly, to the viewer's home. Nobody
// signed in sees only the way to sign in and come back, and nothing of the
// problem is asked for.
export function ProblemPage({ pages, viewer, art }: Props) {
  return (
    <LeavingFrame fallback={homeOf(viewer)}>
      {viewer.kind === 'checking' && <Opening />}
      {viewer.kind === 'guest' && <SignInNote art={art} />}
      {(viewer.kind === 'child' || viewer.kind === 'parent') && (
        <OpenedProblem
          pages={pages}
          csrf={viewer.csrf}
          own={viewer.kind === 'child' ? viewer.csrf : undefined}
        />
      )}
    </LeavingFrame>
  );
}

const Opening = () => <EmptyState icon="clock" title="正在打开这道题" description="请稍等一下。" />;

function SignInNote({ art }: { art: NoteArt }) {
  const { pathname } = useLocation();
  return (
    <ProblemNote
      art={art}
      icon="lock"
      title="登录后才能打开这道题"
      description="请先登录自己的账号。"
      action={{ label: '去登录', to: signInPath(pathname) }}
    />
  );
}

// The problem opened under the viewer's session; `own` is the token of a
// child whose work on it is kept.
function OpenedProblem({ pages, csrf, own }: { pages: ProblemPages; csrf: string; own?: string }) {
  const { id = '', version = '' } = useParams();
  const query = useProblem(id, version, csrf);
  if (query.isPending) return <Opening />;
  if (query.isError)
    return (
      <EmptyState
        icon="alert"
        title="刚才没能打开这道题"
        description="可以再试一次。"
        actionLabel="再试一次"
        onAction={() => {
          void query.refetch();
        }}
      />
    );
  const problem = query.data;
  const renderPage = problem && pages.get(problemPath(problem.id, problem.version));
  if (problem && renderPage)
    return (
      <Fragment key={problemPath(problem.id, problem.version)}>{renderPage(problem, own)}</Fragment>
    );
  return (
    <EmptyState
      icon="sprout"
      title="这道题暂时不可用"
      description="这个题目或版本目前无法打开，可以返回选一道其他题目。"
    />
  );
}

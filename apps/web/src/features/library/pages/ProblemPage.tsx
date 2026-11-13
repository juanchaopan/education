import { Fragment, useCallback, type ReactNode } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import type { ProblemAccessReason, ProblemOpening } from '@education/contracts';
import { problemPath, signInPath } from '../../../shared/lib/problem-path';
import { useLeave } from '../../../shared/lib/useLeave';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { FullscreenFrame } from '../../../shared/ui/FullscreenFrame';
import { ProblemNote } from '../components/ProblemNote';
import { useProblem, type ProblemAnswer } from '../data-access/useProblem';
import { homeOf, type NoteArt, type Viewer } from '../model';

// How a problem's page is opened: with a signed-in child's session token, so
// the child's work is kept, or with none for a parent, who keeps nothing; and
// what to do when the server refuses the problem partway through.
export type ProblemAccess = Readonly<{ csrf?: string; onRefused: () => void }>;

// Each problem version's own page, keyed by problemPath. The app shell supplies
// them, so a page can come from whichever feature teaches it.
export type ProblemPages = ReadonlyMap<
  string,
  (problem: ProblemOpening, access: ProblemAccess) => ReactNode
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

const tokenOf = (viewer: Viewer) =>
  viewer.kind === 'child' || viewer.kind === 'parent' ? viewer.csrf : undefined;

// A problem fills the screen. Its back button returns to the page the viewer
// came from, or, for a link opened directly, to the viewer's home, where a
// child finds the problem's book opened. Nobody signed in sees only the way
// to sign in and come back, and nothing of the problem is asked for.
export function ProblemPage({ pages, viewer, art }: Props) {
  const { id = '', version = '' } = useParams();
  const query = useProblem(id, version, tokenOf(viewer));
  const { refetch } = query;
  // One callback for the page's life, so the lesson's requests keep their scope.
  const onRefused = useCallback(() => {
    void refetch();
  }, [refetch]);
  const answer = query.data;
  const book = answer?.kind === 'opened' ? answer.problem.book : undefined;
  return (
    <LeavingFrame fallback={homeOf(viewer, book)}>
      {viewer.kind === 'checking' || (tokenOf(viewer) && query.isPending) ? (
        <Opening />
      ) : query.isError ? (
        <EmptyState
          icon="alert"
          title="刚才没能打开这道题"
          description="可以再试一次。"
          actionLabel="再试一次"
          onAction={() => {
            void query.refetch();
          }}
        />
      ) : (
        <Answered
          answer={answer ?? { kind: 'signed-out' }}
          pages={pages}
          viewer={viewer}
          art={art}
          onRefused={onRefused}
        />
      )}
    </LeavingFrame>
  );
}

const Opening = () => <EmptyState icon="clock" title="正在打开这道题" description="请稍等一下。" />;

type AnsweredProps = Props & { answer: ProblemAnswer; onRefused: () => void };

// The problem's page, or the note on why it does not open for the viewer.
function Answered({ answer, pages, viewer, art, onRefused }: AnsweredProps) {
  switch (answer.kind) {
    case 'signed-out':
      return <SignInNote art={art} />;
    case 'refused':
      return <RefusalNote art={art} reason={answer.reason} viewer={viewer} />;
    case 'missing':
      return <Missing />;
    case 'opened': {
      const { problem } = answer;
      const path = problemPath(problem.id, problem.version);
      const renderPage = pages.get(path);
      if (!renderPage) return <Missing />;
      const csrf = viewer.kind === 'child' ? viewer.csrf : undefined;
      return <Fragment key={path}>{renderPage(problem, { csrf, onRefused })}</Fragment>;
    }
  }
}

const Missing = () => (
  <EmptyState
    icon="sprout"
    title="这道题暂时不可用"
    description="这个题目或版本目前无法打开，可以返回选一道其他题目。"
  />
);

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

// Why the server refused the problem, with the one way on: a child back to
// the books, a parent back to the parent space.
function RefusalNote(props: { art: NoteArt; reason: ProblemAccessReason; viewer: Viewer }) {
  const action =
    props.viewer.kind === 'parent'
      ? { label: '回到家长空间', to: '/family' }
      : { label: '回到我的书', to: '/' };
  return props.reason === 'unassigned' ? (
    <ProblemNote
      art={props.art}
      icon="book"
      title="请家长安排这本书"
      description="这本书还没有安排给你，家长在书架上安排好以后就能做。"
      action={action}
    />
  ) : (
    <ProblemNote
      art={props.art}
      icon="clock"
      title="这本书暂时不可用"
      description="里面的题先打不开，过一阵再来看看。"
      action={action}
    />
  );
}

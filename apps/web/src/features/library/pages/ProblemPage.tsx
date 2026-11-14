import { Fragment, useCallback, type ReactNode } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import type { ProblemAccessReason, ProblemOpening } from '@education/contracts';
import { problemPath, signInPath } from '../../../shared/lib/problem-path';
import { useLeave } from '../../../shared/lib/useLeave';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { FullscreenFrame } from '../../../shared/ui/FullscreenFrame';
import { PreviewMark } from '../components/PreviewMark';
import { ProblemNote } from '../components/ProblemNote';
import { useBookOpened, useProblem, type ProblemAnswer } from '../data-access/useProblem';
import { homeOf, type NoteArt, type Viewer } from '../model';

// How a problem's page is opened: with the session token of the viewer it
// opened for, and what to do when the server refuses the problem partway
// through. Whether the viewer practises or previews is the opened problem's
// mode.
export type ProblemAccess = Readonly<{ csrf: string; onRefused: () => void }>;

// Each problem version's own page, keyed by problemPath. The app shell supplies
// them, so a page can come from whichever feature teaches it.
export type ProblemPages = ReadonlyMap<
  string,
  (problem: ProblemOpening, access: ProblemAccess) => ReactNode
>;

// The full-screen frame and its way back. Leaving follows every write on its
// way to the server, such as each hint and answer, so only the frame redraws
// for them, never the problem's page it holds.
function LeavingFrame(props: { fallback: string; mark?: ReactNode; children: ReactNode }) {
  const back = useLeave(props.fallback);
  return (
    <FullscreenFrame waiting={back.waiting} onBack={back.leave} mark={props.mark}>
      {props.children}
    </FullscreenFrame>
  );
}

type Props = { pages: ProblemPages; viewer: Viewer; art: NoteArt };

const tokenOf = (viewer: Viewer) =>
  viewer.kind === 'child' || viewer.kind === 'parent' ? viewer.csrf : undefined;

// Opening the problem of the address for the viewer: still waiting, failed
// to ask, or what the server answered, which for nobody signed in is that
// nobody is; and one way to ask again for the page's life, so the lesson's
// requests keep their scope.
function useOpening(viewer: Viewer) {
  const { id = '', version = '' } = useParams();
  const query = useProblem(id, version, tokenOf(viewer));
  const { refetch } = query;
  const again = useCallback(() => {
    void refetch();
  }, [refetch]);
  const answer: ProblemAnswer = query.data ?? { kind: 'signed-out' };
  useBookOpened(query.data, tokenOf(viewer));
  return {
    waiting: viewer.kind === 'checking' || (tokenOf(viewer) !== undefined && query.isPending),
    failed: query.isError,
    answer,
    again,
  };
}

// A problem fills the screen. Its back button returns to the page the viewer
// came from, or, for a link opened directly, to the viewer's home, where a
// child finds the problem's book opened; a parent's preview carries its mark
// beside the button. Nobody signed in sees only the way to sign in and come
// back, and nothing of the problem is asked for.
export function ProblemPage(props: Props) {
  const opening = useOpening(props.viewer);
  const opened = opening.answer.kind === 'opened' ? opening.answer.problem : undefined;
  return (
    <LeavingFrame
      fallback={homeOf(props.viewer, opened?.book)}
      mark={opened?.mode === 'preview' && <PreviewMark />}
    >
      {opening.waiting ? (
        <EmptyState icon="clock" title="正在打开这道题" description="请稍等一下。" />
      ) : opening.failed ? (
        <EmptyState
          icon="alert"
          title="刚才没能打开这道题"
          description="可以再试一次。"
          actionLabel="再试一次"
          onAction={opening.again}
        />
      ) : (
        <Answered {...props} answer={opening.answer} onRefused={opening.again} />
      )}
    </LeavingFrame>
  );
}

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
      const csrf = tokenOf(viewer);
      if (!renderPage || !csrf) return <Missing />;
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

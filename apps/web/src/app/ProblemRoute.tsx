import { useChildSession } from '../features/family/data-access/useChildSession';
import { useParentSession } from '../features/family/data-access/useParentSession';
import type { Viewer } from '../features/library/model';
import { ProblemPage } from '../features/library/pages/ProblemPage';
import { accountArt } from './account-art';
import { lessonPages } from './lesson-pages';

// Who is opening a problem: a signed-in child first, then a parent whose
// email is verified; a parent still verifying counts as nobody signed in.
function useViewer(): Viewer {
  const child = useChildSession();
  const parent = useParentSession();
  if (child.data) return { kind: 'child', csrf: child.data.csrfToken };
  if (child.isPending) return { kind: 'checking' };
  if (parent.data?.access === 'verified') return { kind: 'parent', csrf: parent.data.csrfToken };
  if (parent.isPending) return { kind: 'checking' };
  return { kind: 'guest' };
}

// A problem's page, drawn for whoever opens it. Its notes are drawn on the
// account pages' painting, never on the problem's own.
export function ProblemRoute() {
  return <ProblemPage pages={lessonPages} viewer={useViewer()} art={accountArt} />;
}

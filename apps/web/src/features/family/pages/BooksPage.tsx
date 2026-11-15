import { Navigate } from 'react-router-dom';
import { signInPath } from '../../../shared/lib/sign-in-path';
import type { ChildHomeArt } from '../components/ChildHomeLayout';
import { SessionWaiting } from '../components/SessionWaiting';
import { useChildSession } from '../data-access/useChildSession';
import { ChildHome } from './ChildHome';

// The signed-in child's bookshelf, 我的书. Anyone else, a child who just
// signed out included, goes to the child's sign-in; when the session could
// not be checked, the sign-in says so.
export function BooksPage({ art }: { art: ChildHomeArt }) {
  const session = useChildSession();
  if (session.isPending) return <SessionWaiting label="正在打开你的空间…" />;
  if (!session.data) return <Navigate to={signInPath('child')} replace />;
  return <ChildHome key={session.data.csrfToken} session={session.data} art={art} />;
}

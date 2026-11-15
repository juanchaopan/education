import { Navigate } from 'react-router-dom';
import { signInPath } from '../../../shared/lib/sign-in-path';
import { SessionWaiting } from '../components/SessionWaiting';
import { useChildSession } from '../data-access/useChildSession';
import { useParentSession } from '../data-access/useParentSession';

// The site's home address only leads on: a signed-in child to the bookshelf,
// a signed-in parent to the parent space, anyone else to the child's
// sign-in. The parent's session is asked for only once no child is signed
// in; when the child's could not be checked, the sign-in says so.
export function HomePage() {
  const child = useChildSession();
  const parent = useParentSession(child.data === null);
  if (child.isPending) return <SessionWaiting label="正在打开你的空间…" />;
  if (child.data) return <Navigate to="/books" replace />;
  if (child.isError) return <Navigate to={signInPath('child')} replace />;
  if (parent.isPending) return <SessionWaiting label="正在打开你的空间…" />;
  return <Navigate to={parent.data ? '/family' : signInPath('child')} replace />;
}

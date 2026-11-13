import { Navigate, useSearchParams } from 'react-router-dom';
import { returnPath } from '../../../shared/lib/problem-path';
import { Loading } from '../../../shared/ui/Loading';
import type { AccountArt } from '../components/AccountLayout';
import type { ChildHomeArt } from '../components/ChildHomeLayout';
import { useChildSession } from '../data-access/useChildSession';
import { ChildHome } from './ChildHome';
import { SignInPage } from './SignInPage';
import styles from './HomePage.module.css';

// The site's home page. A signed-in child finds their books here, or, sent
// here on the way to a problem, goes straight on to it; anyone else finds
// the sign-in, which turns into the child's books once a child signs in.
export function HomePage({ art, childArt }: { art: AccountArt; childArt: ChildHomeArt }) {
  const session = useChildSession();
  const [query] = useSearchParams();
  const next = returnPath(query.get('next'));
  if (session.isPending)
    return (
      <div className={styles.waiting}>
        <Loading label="正在打开你的空间…" />
      </div>
    );
  if (!session.data) return <SignInPage art={art} />;
  if (next) return <Navigate to={next} replace />;
  return <ChildHome key={session.data.csrfToken} session={session.data} art={childArt} />;
}

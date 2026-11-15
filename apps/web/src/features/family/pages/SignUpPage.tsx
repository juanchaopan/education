import { Navigate } from 'react-router-dom';
import { signInPath } from '../../../shared/lib/sign-in-path';
import { StandaloneLink } from '../../../shared/ui/StandaloneLink';
import { AccountLayout, type AccountArt } from '../components/AccountLayout';
import { useParentSession } from '../data-access/useParentSession';
import { RegistrationPanel } from './RegistrationPanel';

// A parent's own sign-up, with the way to the parent's sign-in for a parent
// who has an account. A parent already signed in goes on to the parent
// space; the form does not wait to find out, since most parents arriving here
// are new.
export function SignUpPage({ art }: { art: AccountArt }) {
  const session = useParentSession();
  if (session.data) return <Navigate to="/family" replace />;
  return (
    <AccountLayout
      art={art}
      titleId="registration-title"
      title="创建家长账号"
      footer={<StandaloneLink to={signInPath('parent')}>已有账号？去登录</StandaloneLink>}
    >
      <RegistrationPanel />
    </AccountLayout>
  );
}

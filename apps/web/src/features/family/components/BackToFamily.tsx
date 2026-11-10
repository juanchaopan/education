import { Icon } from '../../../shared/ui/Icon';
import { StandaloneLink } from '../../../shared/ui/StandaloneLink';

// The way back from a mail link's page to the parents' entrance.
export function BackToFamily() {
  return (
    <StandaloneLink to="/family">
      <Icon name="back" />
      返回家长空间
    </StandaloneLink>
  );
}

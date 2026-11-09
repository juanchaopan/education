import { Link } from 'react-router-dom';
import { Icon } from './Icon';
import type { IconName } from './icons';
import styles from './IconButton.module.css';

type Props = {
  to: string;
  icon: IconName;
  // A link with only an icon still needs a name for screen readers.
  label: string;
};

// A link to another page drawn as a round icon button, such as the "+" that
// leads to where practice is planned.
export function IconLink({ to, icon, label }: Props) {
  return (
    <Link to={to} aria-label={label} className={styles.button}>
      <Icon name={icon} />
    </Link>
  );
}

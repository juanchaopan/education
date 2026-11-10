import { NavLink } from 'react-router-dom';
import { classNames } from '../lib/class-names';
import { Icon } from './Icon';
import styles from './Brand.module.css';

type Props = {
  // Places the brand in its parent's layout.
  className?: string;
  // Lets a narrow header hide the name, which stays the link's name for
  // screen readers.
  nameClassName?: string;
};

// The site's sprout mark and name, leading home from wherever it is shown.
export function Brand({ className, nameClassName }: Props) {
  return (
    <NavLink to="/" aria-label="小小探索家首页" className={classNames(styles.brand, className)}>
      <span className={styles.mark}>
        <Icon name="sprout" />
      </span>
      <span className={nameClassName}>小小探索家</span>
    </NavLink>
  );
}

import { classNames } from '../lib/class-names';
import { glyphs, type IconName } from './icons';
import styles from './Icon.module.css';

type Props = {
  name: IconName;
  // A badge sets the icon on a soft tile, as the mark at the top of a card.
  badge?: boolean;
  className?: string;
};

// Icons are decoration: the text or label beside them carries the meaning, so
// screen readers skip them.
export function Icon({ name, badge, className }: Props) {
  return (
    <span aria-hidden="true" className={classNames(badge && styles.badge, className) || undefined}>
      {glyphs[name]}
    </span>
  );
}

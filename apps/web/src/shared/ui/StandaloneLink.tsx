import { Link, type LinkProps } from 'react-router-dom';
import styles from './StandaloneLink.module.css';

// A link that stands apart from any sentence, such as "back" or "ask a parent".
// Links inside a sentence stay plain text links.
export function StandaloneLink(props: Omit<LinkProps, 'className'>) {
  return <Link {...props} className={styles.link} />;
}

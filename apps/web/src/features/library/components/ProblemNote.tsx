import { Link } from 'react-router-dom';
import { Icon } from '../../../shared/ui/Icon';
import type { IconName } from '../../../shared/ui/icons';
import type { NoteArt } from '../model';
import styles from './ProblemNote.module.css';

type Props = {
  art: NoteArt;
  icon: IconName;
  title: string;
  description: string;
  action: Readonly<{ label: string; to: string }>;
};

// Why a problem does not open, in place of its lesson: a softly blurred
// painting that is not the problem's own, so nothing of the problem shows,
// the teaching character beside a smoked glass note, and one golden way on.
// It looks the same at any time of day, like the lesson it stands in for.
export function ProblemNote({ art, icon, title, description, action }: Props) {
  return (
    <div className={styles.frame}>
      <img className={styles.backdrop} src={art.backdrop} alt="" />
      <div className={styles.shade} />
      <div className={styles.note}>
        <img className={styles.teacher} src={art.teacher} alt="" />
        <section className={styles.pane} aria-labelledby="problem-note-title">
          <span className={styles.glyph}>
            <Icon name={icon} />
          </span>
          <h1 id="problem-note-title" className={styles.title}>
            {title}
          </h1>
          <p className={styles.description}>{description}</p>
          <Link to={action.to} className={styles.action}>
            {action.label}
          </Link>
        </section>
      </div>
    </div>
  );
}

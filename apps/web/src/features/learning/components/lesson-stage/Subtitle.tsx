import { Dewdrop } from '../../../../shared/ui/Dewdrop';
import { Icon } from '../../../../shared/ui/Icon';
import { Spoken } from '../../../../shared/ui/Spoken';
import type { Teacher } from './stage-look';
import { TeacherAvatar } from './TeacherAvatar';
import { WaitingDots } from './WaitingDots';
import styles from './Subtitle.module.css';

// Where the teacher's narration stands: paused until the child carries it on,
// or held while the child speaks.
export type NarrationHold = 'paused' | 'held';

type Props = {
  teacher: Pick<Teacher, 'name' | 'image' | 'face'>;
  // The teacher's latest words.
  text?: string;
  // The teacher is working out a reply, which follows the words on screen.
  thinking?: boolean;
  narration?: NarrationHold;
  onResume?: () => void;
};

function Mark({ narration, teacher, onResume }: Omit<Props, 'text' | 'thinking'>) {
  if (narration === 'paused')
    return (
      <span className={styles.mark}>
        <Dewdrop
          icon="play"
          tone="honey"
          size="small"
          label={`接着听${teacher.name}讲`}
          onClick={onResume}
        />
      </span>
    );
  if (narration === 'held')
    return (
      <span className={styles.held} aria-hidden="true">
        <Icon name="pause" />
      </span>
    );
  return null;
}

// What the teacher says, as a film's subtitle beside the teacher's round
// portrait: the lines it narrates and every reply, one at a time, the newest
// in place of the last. A paused narration is carried on from the play mark
// on the portrait; while the child speaks the mark only shows it is held.
// Screen readers hear each new line with the teacher's name before it, once.
// With nothing to say the subtitle fades out but stays in place, so screen
// readers keep hearing its next words. Long words scroll inside the
// subtitle, so while it has words it takes the keyboard's focus too and can
// be scrolled with the arrow keys.
export function Subtitle({ teacher, text, thinking = false, narration, onResume }: Props) {
  const saying = !!text || thinking;
  return (
    <section
      className={styles.subtitle}
      aria-label={`${teacher.name}的话`}
      data-quiet={(!saying && !narration) || undefined}
    >
      <TeacherAvatar teacher={teacher}>
        <Mark narration={narration} teacher={teacher} onResume={onResume} />
      </TeacherAvatar>
      <p className={styles.words} role="status" tabIndex={saying ? 0 : undefined}>
        {saying && <Spoken>{teacher.name}：</Spoken>}
        {text}
        {thinking && (
          <span className={styles.thinking}>
            <WaitingDots label="正在想…" />
          </span>
        )}
      </p>
    </section>
  );
}

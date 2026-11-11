import type { CSSProperties, ReactNode } from 'react';
import type { Teacher } from './stage-look';
import styles from './TeacherAvatar.module.css';

type Props = {
  teacher: Pick<Teacher, 'name' | 'image' | 'face'>;
  // A small mark on the portrait's lower edge, such as the button that
  // carries on a paused narration.
  children?: ReactNode;
};

const percent = (share: number) => `${share * 100}%`;

// The teacher's face in a round glass frame, cut from its full-length
// picture. Margins in percent are measured against the frame's width, as the
// face is against the picture's, so the picture is set out by its face alone.
function faceStyle({ x, y, size }: Teacher['face']): CSSProperties {
  return {
    inlineSize: percent(1 / size),
    marginInlineStart: percent(-x / size),
    marginBlockStart: percent(-y / size),
  };
}

export function TeacherAvatar({ teacher, children }: Props) {
  return (
    <span className={styles.avatar}>
      <span className={styles.frame}>
        <img src={teacher.image} alt="" style={faceStyle(teacher.face)} />
      </span>
      {children}
    </span>
  );
}

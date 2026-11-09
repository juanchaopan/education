import type { Box } from './stage-look';
import styles from './ClearingOutline.module.css';

type Props = {
  box: Box;
  // A backdrop's clearing, or the part of the world a lesson's props take up.
  kind: 'clearing' | 'staging';
};

// An outline drawn on the 1200×675 world, for a person checking by eye that a
// backdrop's clearing is where its picture is clear and that a lesson's props
// stand inside it. Lessons never show it to children.
export function ClearingOutline({ box, kind }: Props) {
  return <rect className={styles[kind]} {...box} aria-hidden="true" />;
}

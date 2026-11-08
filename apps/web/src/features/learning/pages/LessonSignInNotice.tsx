import { StandaloneLink } from '../../../shared/ui/StandaloneLink';
import styles from './LessonSignInNotice.module.css';

// Shown under a lesson to a visitor, who can watch and play but whose place,
// questions and answers are not kept.
export function LessonSignInNotice({ teacher }: { teacher: string }) {
  return (
    <p className={styles.notice}>
      在孩子空间登录以后，{teacher}会帮你记住做到哪里，还能回答你的问题、听你说答案。
      <StandaloneLink to="/child">去孩子空间登录</StandaloneLink>
    </p>
  );
}

import { Link } from 'react-router-dom';
import type { PracticePage } from '@education/contracts';
import { problemPath } from '../../../shared/lib/problem-path';
import styles from './Practice.module.css';

export function PracticeList({
  problems,
  learner,
}: {
  problems: PracticePage['problems'];
  learner: boolean;
}) {
  if (!problems.length)
    return <p>{learner ? '家长还没有给你安排练习。' : '还没有给这位孩子安排练习。'}</p>;
  return (
    <ul className={styles.list}>
      {problems.map(({ id, version, title }) => (
        <li key={problemPath(id, version)} className={styles.item}>
          {title === null ? (
            <span>
              {learner ? '有一道练习的原版本暂时打不开。' : `${id}（版本 ${version}）暂时不可用。`}
            </span>
          ) : learner ? (
            <Link to={problemPath(id, version)}>{title}</Link>
          ) : (
            <span>
              {title}（版本 {version}）
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

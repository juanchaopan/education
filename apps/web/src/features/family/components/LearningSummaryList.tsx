import type { ProblemLearningSummary } from '@education/contracts';
import { Icon } from '../../../shared/ui/Icon';
import { MoreInfo } from '../../../shared/ui/MoreInfo';
import { StatTiles } from './StatTiles';
import styles from './LearningSummary.module.css';

// A child's record, problem by problem. It never claims mastery: the record
// is evidence of what happened, and how it is counted is folded away for
// whoever wants to know.
export function LearningSummaryList({ problems }: { problems: readonly ProblemLearningSummary[] }) {
  if (!problems.length) return <p role="status">还没有这位孩子的学习记录。</p>;
  return (
    <>
      <p className={styles.caution}>
        <Icon name="info" />
        当前记录不足以判断是否掌握。
      </p>
      <MoreInfo label="怎么统计">
        每个版本分别统计。同一轮打开同一条提示、或在作答时向老师提问，都只记一次。无法判定的作答不会记为答错。
      </MoreInfo>
      <ul className={styles.problems}>
        {problems.map((problem) => (
          <ProblemEvidence key={`${problem.id}/${problem.version}`} problem={problem} />
        ))}
      </ul>
    </>
  );
}

function ProblemEvidence({ problem }: { problem: ProblemLearningSummary }) {
  const stats = [
    ['独立完成', `${problem.independent} 次`],
    ['提示后完成', `${problem.assisted} 次`],
    ['提示记录', `${problem.hints} 次`],
    ['确认答错', `${problem.incorrect} 次`],
    ['无法判定', `${problem.uncertain} 次`],
  ] as const;
  return (
    <li className={styles.problem}>
      <h3>{problem.title ?? problem.id}</h3>
      <p className={styles.version}>第 {problem.version} 版</p>
      <StatTiles tiles={stats} />
      {problem.reviewSuggested && (
        <p className={styles.review}>
          <strong>优先复习</strong> · 这个版本确认答错 {problem.incorrect} 次，尚无独立完成记录。
          可以和孩子回顾思路，再让孩子独立试一次。
        </p>
      )}
    </li>
  );
}

import type { ProblemLearningSummary } from '@education/contracts';
import styles from './LearningSummary.module.css';

export function LearningSummaryList({ problems }: { problems: readonly ProblemLearningSummary[] }) {
  if (!problems.length) return <p role="status">还没有这位孩子的学习记录。</p>;
  return (
    <>
      <p>当前记录不足以判断是否掌握。</p>
      <p>每个版本分别统计。同一轮打开同一提示，只记一次。无法判定的作答不会记为答错。</p>
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
    ['独立完成', problem.independent],
    ['提示后完成', problem.assisted],
    ['提示记录', problem.hints],
    ['确认答错', problem.incorrect],
    ['无法判定', problem.uncertain],
  ] as const;
  return (
    <li className={styles.problem}>
      <h3>{problem.title ?? problem.id}</h3>
      <p className={styles.version}>第 {problem.version} 版</p>
      <dl className={styles.stats}>
        {stats.map(([label, count]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{count} 次</dd>
          </div>
        ))}
      </dl>
      {problem.reviewSuggested && (
        <p className={styles.review}>
          <strong>优先复习</strong> · 这个版本确认答错 {problem.incorrect} 次，尚无独立完成记录。
          可以和孩子回顾思路，再让孩子独立试一次。
        </p>
      )}
    </li>
  );
}

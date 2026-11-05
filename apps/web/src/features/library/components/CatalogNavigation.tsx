import { useId } from 'react';
import { Link } from 'react-router-dom';
import type { ProblemSummary } from '@education/contracts';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { problemPath, type CategoryLevel } from '../model';
import styles from './CatalogNavigation.module.css';

const levels = [
  { key: 'grade', label: '年级' },
  { key: 'subject', label: '学科' },
  { key: 'category', label: '分类' },
] as const;

type Selection = Record<CategoryLevel, { options: string[]; value: string }>;

type CatalogNavigationProps = {
  selection: Selection;
  problems: ProblemSummary[];
  onChange: (level: CategoryLevel, value: string) => void;
};

export function CatalogNavigation({ selection, problems, onChange }: CatalogNavigationProps) {
  const prefix = useId();
  return (
    <div className={styles.navigation}>
      <div className={styles.filters} role="group" aria-label="筛选题目">
        {levels.map(({ key, label }) => (
          <div className={styles.filter} key={key}>
            <label htmlFor={`${prefix}-${key}`}>{label}</label>
            <select
              id={`${prefix}-${key}`}
              value={selection[key].value}
              onChange={(event) => onChange(key, event.currentTarget.value)}
            >
              {selection[key].options.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
      {problems.length > 0 ? (
        <ol aria-label="题目顺序" className={styles.problems}>
          {problems.map(({ id, title, version }) => (
            <li key={id}>
              <Link to={problemPath(id, version)}>{title}</Link>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState icon="✿" title="这个分类还没有题目" description="可以换一个分类继续探索。" />
      )}
    </div>
  );
}

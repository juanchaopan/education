import type { ChildBookCounts, ChildBookFilter } from '@education/contracts';
import { RaisedButton } from '../../../shared/ui/RaisedButton';
import styles from './BookFilters.module.css';

type Choice = ChildBookFilter | 'all';

const choices: readonly { choice: Choice; label: string }[] = [
  { choice: 'all', label: '全部' },
  { choice: 'learning', label: '在学' },
  { choice: 'finished', label: '学完' },
  { choice: 'unavailable', label: '暂时不可用' },
];

type Props = {
  counts: ChildBookCounts;
  // The filter in use; all of the books without one.
  filter?: ChildBookFilter;
  onFilter: (filter?: ChildBookFilter) => void;
};

// The filters over the child's books, one chosen at a time, each with how
// many books it holds. 在学 carries a red disc with the number of new books;
// 暂时不可用 shows only when there are such books. The arrow keys move along
// them, as in any set of choices.
export function BookFilters({ counts, filter, onFilter }: Props) {
  const shown = choices.filter(({ choice }) => choice !== 'unavailable' || counts.unavailable > 0);
  const chosen: Choice = filter ?? 'all';
  const choose = (choice: Choice) => onFilter(choice === 'all' ? undefined : choice);
  const move = (step: number) => {
    const place = shown.findIndex(({ choice }) => choice === chosen);
    const next = shown[(place + step + shown.length) % shown.length]!;
    choose(next.choice);
    document.getElementById(`book-filter-${next.choice}`)?.focus();
  };
  return (
    <div
      role="radiogroup"
      aria-label="筛选"
      className={styles.filters}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') move(1);
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') move(-1);
      }}
    >
      {shown.map(({ choice, label }) => (
        <RaisedButton
          key={choice}
          id={`book-filter-${choice}`}
          role="radio"
          aria-checked={choice === chosen}
          tabIndex={choice === chosen ? 0 : -1}
          chosen={choice === chosen}
          className={styles.chip}
          onClick={() => choose(choice)}
        >
          {label}
          <small className={styles.count}>{counts[choice]}</small>
          {choice === 'learning' && counts.fresh > 0 && (
            <span className={styles.badge} aria-label={`${counts.fresh} 本新书`}>
              {counts.fresh}
            </span>
          )}
        </RaisedButton>
      ))}
    </div>
  );
}

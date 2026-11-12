import { Card } from '../../../shared/ui/Card';
import { Icon } from '../../../shared/ui/Icon';
import { subjectLook } from '../../../shared/ui/subject-looks';
import type { ShelfFilter } from '../model';
import { ShelfChoices } from './ShelfChoices';
import styles from './ShelfFilters.module.css';

type Props = {
  // The grades the shelf has books in, and the subjects of the chosen grade,
  // in the catalogue's order.
  grades: readonly string[];
  subjects: readonly string[];
  value: ShelfFilter;
  // One child's shelf can also keep the books the child has or does not have.
  byState: boolean;
  onChange: (value: ShelfFilter) => void;
};

const all = { value: '', label: '全部' } as const;
const states = [
  all,
  { value: 'assigned', label: '已安排' },
  { value: 'unassigned', label: '未安排' },
] as const;

// The grade as a segmented bar, the subject as chips with the subject's
// icon, and on a child's shelf whether the child has the book. Choosing
// another grade clears the subject, since the subjects follow the grade.
export function ShelfFilters({ grades, subjects, value, byState, onChange }: Props) {
  return (
    <Card className={styles.filters}>
      <ShelfChoices
        legend="年级"
        name="shelf-grade"
        look="segment"
        value={value.grade}
        choices={[all, ...grades.map((grade) => ({ value: grade, label: grade }))]}
        onChange={(grade) => onChange({ ...value, grade, subject: '' })}
      />
      <div className={styles.line}>
        <ShelfChoices
          legend="科目"
          name="shelf-subject"
          look="chip"
          value={value.subject}
          choices={[
            all,
            ...subjects.map((subject) => ({
              value: subject,
              label: subject,
              mark: <Icon name={subjectLook(subject).icon} />,
            })),
          ]}
          onChange={(subject) => onChange({ ...value, subject })}
        />
        {byState && (
          <>
            <span className={styles.divider} aria-hidden="true" />
            <ShelfChoices
              legend="安排"
              name="shelf-state"
              look="segment"
              value={value.state}
              choices={states}
              onChange={(state) => onChange({ ...value, state })}
            />
          </>
        )}
      </div>
    </Card>
  );
}

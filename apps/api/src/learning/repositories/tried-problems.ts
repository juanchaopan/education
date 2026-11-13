// Which children to read: the one whose id is the query parameter named, or
// every child in the query's `family` CTE.
export type TriedBy = `$${number}` | 'family';

const childCondition = (children: TriedBy) =>
  children === 'family' ? 'IN (SELECT id FROM family)' : `=${children}`;

// The SQL for every problem version the children have evidence for: one they
// answered or asked for help on.
export function triedProblems(children: TriedBy) {
  const condition = childCondition(children);
  return `SELECT child_id,problem_id,problem_version FROM progress WHERE child_id${condition}
  UNION
  SELECT child_id,problem_id,problem_version FROM help_events WHERE child_id${condition}`;
}

// The SQL for every problem version some children have evidence for: one they
// answered or asked for help on. `children` is the condition on child_id that
// picks them, such as `=$1` or `IN (SELECT id FROM family)`.
export const triedProblems = (children: string) =>
  `SELECT child_id,problem_id,problem_version FROM progress WHERE child_id ${children}
  UNION
  SELECT child_id,problem_id,problem_version FROM help_events WHERE child_id ${children}`;

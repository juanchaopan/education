import { describe, expect, it } from 'vitest';
import { triedProblems } from './tried-problems.js';

const conditions = (sql: string) => [...sql.matchAll(/WHERE (.+)$/gm)].map(([, found]) => found);

describe('triedProblems', () => {
  it('reads one child by the query parameter named, from answers and from help', () => {
    const sql = triedProblems('$1');
    expect(sql).toMatch(/FROM progress WHERE/);
    expect(sql).toMatch(/FROM help_events WHERE/);
    expect(conditions(sql)).toEqual(['child_id=$1', 'child_id=$1']);
  });

  it("reads every child of the query's family", () => {
    expect(conditions(triedProblems('family'))).toEqual([
      'child_id IN (SELECT id FROM family)',
      'child_id IN (SELECT id FROM family)',
    ]);
  });
});

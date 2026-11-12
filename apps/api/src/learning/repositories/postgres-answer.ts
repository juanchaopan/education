import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import type { AttemptReceipt, SubmitAnswer } from '@education/contracts';
import { fingerprint, orderedInput } from './fingerprint.js';
import { deleteDraftRevision } from './postgres-draft.js';

type Problem = { id: string; version: number };
type Outcome = AttemptReceipt['outcome'];
type Submission = Omit<SubmitAnswer, 'action' | 'input'>;
const initialRound = '00000000-0000-0000-0000-000000000000';
const slot = 'child_id=$1 AND problem_id=$2 AND problem_version=$3';

// Whether the child has answered the problem version right at least once, on
// their own or after help, in any round.
export async function answeredRight(client: pg.PoolClient, child: string, problem: Problem) {
  const { rows } = await client.query<{ answered: boolean }>(
    `SELECT independent + assisted > 0 AS answered FROM progress WHERE ${slot}`,
    [child, problem.id, problem.version],
  );
  return rows[0]?.answered ?? false;
}

export function answersFor(client: pg.PoolClient, child: string, problem: Problem, secret: string) {
  const key = [child, problem.id, problem.version];
  return {
    round: async () => {
      const { rows } = await client.query<{ round: string }>(
        `SELECT round FROM progress WHERE ${slot}`,
        key,
      );
      return rows[0]?.round ?? initialRound;
    },
    previous: async (id: string) => {
      const { rows } = await client.query<{ fingerprint: string; outcome: Outcome }>(
        `SELECT fingerprint,outcome FROM attempts WHERE ${slot} AND attempt_id=$4`,
        [...key, id],
      );
      return rows[0];
    },
    fingerprint: ({ attemptId, round, draftRevision, input }: SubmitAnswer) =>
      fingerprint(secret, [
        'lesson-answer',
        ...key,
        attemptId,
        round,
        draftRevision,
        orderedInput(input),
      ]),
    // Each kind of help is kept once per round, under the id of what helped.
    help: async (round: string, helpId: string) => {
      await client.query(
        `INSERT INTO help_events(child_id,problem_id,problem_version,round,hint_id)
        VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
        [...key, round, helpId],
      );
    },
    usedHelp: async (round: string) => {
      const result = await client.query(
        `SELECT 1 FROM help_events WHERE ${slot} AND round=$4 LIMIT 1`,
        [...key, round],
      );
      return result.rowCount === 1;
    },
    commit: async (submission: Submission, digest: string, outcome: Outcome) => {
      await commitAttempt(client, key, submission, digest, outcome);
      if (submission.draftRevision)
        await deleteDraftRevision(client, child, problem, submission.draftRevision);
    },
  };
}

async function commitAttempt(
  client: pg.PoolClient,
  key: (string | number)[],
  submission: Submission,
  digest: string,
  outcome: Outcome,
) {
  await client.query(
    `INSERT INTO attempts(child_id,problem_id,problem_version,attempt_id,round,fingerprint,outcome)
    VALUES($1,$2,$3,$4,$5,$6,$7)`,
    [...key, submission.attemptId, submission.round, digest, outcome],
  );
  const complete = outcome === 'independent' || outcome === 'assisted';
  await client.query(
    `INSERT INTO progress(child_id,problem_id,problem_version,round,independent,assisted,incorrect,uncertain)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(child_id,problem_id,problem_version) DO UPDATE SET
    round=excluded.round, independent=progress.independent+excluded.independent,
    assisted=progress.assisted+excluded.assisted, incorrect=progress.incorrect+excluded.incorrect,
    uncertain=progress.uncertain+excluded.uncertain, updated_at=now()`,
    [
      ...key,
      complete ? randomUUID() : submission.round,
      Number(outcome === 'independent'),
      Number(outcome === 'assisted'),
      Number(outcome === 'incorrect'),
      Number(outcome === 'uncertain'),
    ],
  );
}

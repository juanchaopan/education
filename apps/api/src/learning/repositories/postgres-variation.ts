import type pg from 'pg';
import type { SubmitGuess } from '@education/contracts';
import type { JudgedOutcome } from '../domain/outcome.js';
import { fingerprint, orderedInput } from './fingerprint.js';

type Problem = { id: string; version: number };
type Key = readonly [child: string, problemId: string, version: number];
type Answer = {
  attemptId: string;
  round: string;
  part: 'guess' | 'reason';
  fingerprint: string | null;
  outcome: JudgedOutcome;
};
const slot = 'child_id=$1 AND problem_id=$2 AND problem_version=$3';
const clear = "outcome IN ('independent','assisted')";

// One child's variation of one problem, read and written in the caller's
// transaction, which holds the problem's learning lock.
export function variationsFor(
  client: pg.PoolClient,
  child: string,
  problem: Problem,
  secret: string,
) {
  const key: Key = [child, problem.id, problem.version];
  return { ...answers(client, key, secret), ...help(client, key) };
}

function answers(client: pg.PoolClient, key: Key, secret: string) {
  return {
    // The round of the latest right final answer, which the variation that
    // follows it is recorded under.
    completedRound: async () => {
      const { rows } = await client.query<{ round: string }>(
        `SELECT round FROM attempts WHERE ${slot} AND ${clear}
        ORDER BY submitted_at DESC LIMIT 1`,
        [...key],
      );
      return rows[0]?.round;
    },
    previous: async (attemptId: string) => {
      const { rows } = await client.query<Omit<Answer, 'attemptId' | 'round'>>(
        `SELECT part,fingerprint,outcome FROM variation_answers WHERE ${slot} AND attempt_id=$4`,
        [...key, attemptId],
      );
      return rows[0];
    },
    fingerprint: ({ attemptId, round, input }: SubmitGuess) =>
      fingerprint(secret, ['variation-guess', ...key, attemptId, round, orderedInput(input)]),
    recorded: async (round: string) => {
      const { rows } = await client.query<{ guessed: boolean; explained: boolean }>(
        `SELECT coalesce(bool_or(part='guess'),false) AS guessed,
          coalesce(bool_or(part='reason' AND ${clear}),false) AS explained
        FROM variation_answers WHERE ${slot} AND round=$4`,
        [...key, round],
      );
      return rows[0] ?? { guessed: false, explained: false };
    },
    record: async (answer: Answer) => {
      await client.query(
        `INSERT INTO variation_answers(child_id,problem_id,problem_version,attempt_id,round,part,fingerprint,outcome)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
        [...key, answer.attemptId, answer.round, answer.part, answer.fingerprint, answer.outcome],
      );
    },
  };
}

function help(client: pg.PoolClient, key: Key) {
  return {
    // Each kind of help is kept once per round, under the id of what helped.
    help: async (round: string, helpId: string) => {
      await client.query(
        `INSERT INTO variation_help(child_id,problem_id,problem_version,round,help_id)
        VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
        [...key, round, helpId],
      );
    },
    usedHelp: async (round: string) => {
      const result = await client.query(
        `SELECT 1 FROM variation_help WHERE ${slot} AND round=$4 LIMIT 1`,
        [...key, round],
      );
      return result.rowCount === 1;
    },
  };
}

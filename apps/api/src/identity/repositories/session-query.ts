import { sql } from 'drizzle-orm';

export const accountColumns = sql`p.id, p.family_id AS "familyId", p.email, p.password_hash AS "passwordHash",
  p.email_verified AS "emailVerified", p.credential_version AS "credentialVersion", f.auth_epoch AS "familyEpoch"`;

// All session-authorized queries bind the same parent, family epoch and expiry.
export const currentSession = sql`s.parent_id=p.id AND p.family_id=f.id
  AND s.credential_version=p.credential_version AND s.family_epoch=f.auth_epoch
  AND (NOT s.verified OR p.email_verified)
  AND s.expires_at > clock_timestamp()
  AND s.last_seen_at > clock_timestamp() - CASE WHEN s.verified THEN interval '12 hours' ELSE interval '15 minutes' END`;

// A child's session `s` that still holds for child `c` of family `f`: the
// child's PIN and the family's sign-in epoch are unchanged, and it has
// neither expired nor gone unused for 180 days.
export const currentChildSession = `s.child_id=c.id AND c.family_id=f.id
  AND c.pin_pepper_version=1 AND s.credential_version=c.credential_version
  AND s.family_epoch=f.auth_epoch AND s.expires_at>clock_timestamp()
  AND s.last_seen_at>clock_timestamp()-interval '180 days'`;

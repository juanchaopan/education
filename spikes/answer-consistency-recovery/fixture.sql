CREATE TABLE family (id text PRIMARY KEY);
CREATE TABLE child (
  id text PRIMARY KEY,
  family_id text NOT NULL REFERENCES family ON DELETE CASCADE
);
CREATE TABLE session_token (
  token text PRIMARY KEY,
  child_id text NOT NULL REFERENCES child ON DELETE CASCADE
);
CREATE TABLE attempt (
  child_id text REFERENCES child ON DELETE CASCADE,
  question_version text,
  request_id text,
  payload_fingerprint text NOT NULL,
  receipt bigint GENERATED ALWAYS AS IDENTITY,
  PRIMARY KEY (child_id, question_version, request_id)
);
CREATE TABLE progress (
  child_id text REFERENCES child ON DELETE CASCADE,
  question_version text,
  total integer NOT NULL,
  PRIMARY KEY (child_id, question_version)
);
CREATE SEQUENCE draft_version;
CREATE TABLE draft (
  child_id text REFERENCES child ON DELETE CASCADE,
  question_version text,
  version bigint NOT NULL DEFAULT nextval('draft_version'),
  content text NOT NULL,
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (child_id, question_version)
);

CREATE FUNCTION submit(
  who text, question text, request text, fingerprint text, expected_draft bigint DEFAULT NULL
) RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  saved_receipt bigint;
  saved_fingerprint text;
BEGIN
  INSERT INTO attempt (child_id, question_version, request_id, payload_fingerprint)
  VALUES (who, question, request, fingerprint)
  ON CONFLICT DO NOTHING
  RETURNING receipt INTO saved_receipt;

  IF FOUND THEN
    INSERT INTO progress VALUES (who, question, 1)
    ON CONFLICT (child_id, question_version) DO UPDATE SET total = progress.total + 1;
    DELETE FROM draft WHERE child_id = who AND question_version = question AND version = expected_draft;
  ELSE
    SELECT receipt, payload_fingerprint INTO STRICT saved_receipt, saved_fingerprint
      FROM attempt WHERE child_id = who AND question_version = question AND request_id = request;
    IF saved_fingerprint <> fingerprint THEN
      RETURN 'conflict';
    END IF;
  END IF;

  RETURN 'receipt:' || saved_receipt;
END;
$$;

CREATE FUNCTION save_draft(who text, question text, expected bigint, body text)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  current_version bigint;
BEGIN
  UPDATE draft
    SET content = body, version = nextval('draft_version'), expires_at = now() + interval '7 days'
    WHERE child_id = who AND question_version = question AND version = expected AND expires_at > now()
    RETURNING version INTO current_version;
  IF FOUND THEN
    RETURN 'saved:' || current_version;
  END IF;
  SELECT version INTO current_version FROM draft
    WHERE child_id = who AND question_version = question AND expires_at > now();
  RETURN 'conflict:' || coalesce(current_version::text, 'missing');
END;
$$;

INSERT INTO family VALUES ('keep'), ('erase');
INSERT INTO child VALUES ('keeper', 'keep'), ('erased', 'erase');
INSERT INTO session_token VALUES ('keep-session', 'keeper'), ('old-session', 'erased');
INSERT INTO draft (child_id, question_version, content, expires_at) VALUES
  ('keeper', 'draft-race', 'initial', now() + interval '7 days'),
  ('keeper', 'expired', 'expired', now() - interval '1 second'),
  ('erased', 'private', 'synthetic', now() + interval '7 days');
SELECT submit('erased', 'question', 'seed', 'synthetic');

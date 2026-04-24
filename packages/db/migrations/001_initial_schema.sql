-- 001_initial_schema
-- Creates all 11 core entities for preview-qa-agent

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- installation: GitHub App installation metadata
CREATE TABLE installation (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  github_id     BIGINT NOT NULL UNIQUE,
  account_login TEXT NOT NULL,
  account_type  TEXT NOT NULL CHECK (account_type IN ('User', 'Organization')),
  tier          TEXT NOT NULL DEFAULT 'free',
  suspended_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- repository: onboarded repo metadata and config
CREATE TABLE repository (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  installation_id TEXT NOT NULL REFERENCES installation(id) ON DELETE CASCADE,
  github_id       BIGINT NOT NULL UNIQUE,
  full_name       TEXT NOT NULL,
  default_branch  TEXT NOT NULL DEFAULT 'main',
  config          JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- pull_request: normalized PR record
CREATE TABLE pull_request (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  repository_id   TEXT NOT NULL REFERENCES repository(id) ON DELETE CASCADE,
  github_number   INT NOT NULL,
  title           TEXT NOT NULL,
  author_login    TEXT NOT NULL,
  head_sha        TEXT NOT NULL,
  head_branch     TEXT NOT NULL,
  base_branch     TEXT NOT NULL,
  is_fork         BOOLEAN NOT NULL DEFAULT FALSE,
  body            TEXT,
  state           TEXT NOT NULL DEFAULT 'open',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (repository_id, github_number)
);

-- run: one QA run for a PR head SHA and mode
CREATE TABLE run (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  pull_request_id TEXT NOT NULL REFERENCES pull_request(id) ON DELETE CASCADE,
  repository_id   TEXT NOT NULL REFERENCES repository(id) ON DELETE CASCADE,
  installation_id TEXT NOT NULL REFERENCES installation(id) ON DELETE CASCADE,
  sha             TEXT NOT NULL,
  mode            TEXT NOT NULL CHECK (mode IN ('smoke', 'instruction', 'hybrid')),
  state           TEXT NOT NULL DEFAULT 'queued' CHECK (state IN (
    'queued', 'waiting_for_preview', 'planning', 'running',
    'analyzing', 'reporting', 'completed', 'failed',
    'blocked_environment', 'needs_human', 'canceled'
  )),
  preview_url     TEXT,
  triggered_by    TEXT NOT NULL DEFAULT 'push',
  github_check_id BIGINT,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_run_pull_request_id ON run(pull_request_id);
CREATE INDEX idx_run_state ON run(state);
CREATE INDEX idx_run_sha ON run(sha);

-- plan: normalized test plan generated from PR instructions
CREATE TABLE plan (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  run_id          TEXT NOT NULL REFERENCES run(id) ON DELETE CASCADE,
  parse_outcome   TEXT NOT NULL CHECK (parse_outcome IN ('parse.found', 'parse.not_found', 'parse.error')),
  raw_yaml        TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- test_case: executable test case metadata
CREATE TABLE test_case (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  plan_id     TEXT NOT NULL REFERENCES plan(id) ON DELETE CASCADE,
  run_id      TEXT NOT NULL REFERENCES run(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  steps       JSONB NOT NULL DEFAULT '[]',
  "order"     INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- result: summarized outcome and classification
CREATE TABLE result (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  run_id            TEXT NOT NULL REFERENCES run(id) ON DELETE CASCADE,
  test_case_id      TEXT REFERENCES test_case(id) ON DELETE CASCADE,
  outcome           TEXT NOT NULL CHECK (outcome IN ('pass', 'fail', 'blocked', 'skipped')),
  failure_category  TEXT CHECK (failure_category IN (
    'product_bug', 'test_bug', 'environment_issue', 'flaky', 'needs_clarification'
  )),
  summary           TEXT,
  step_results      JSONB NOT NULL DEFAULT '[]',
  duration_ms       INT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- artifact: screenshot/trace/video/log references
CREATE TABLE artifact (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  run_id      TEXT NOT NULL REFERENCES run(id) ON DELETE CASCADE,
  result_id   TEXT REFERENCES result(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('screenshot', 'trace', 'video', 'log')),
  blob_url    TEXT NOT NULL,
  filename    TEXT NOT NULL,
  size_bytes  BIGINT,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- comment_record: sticky PR comment tracking
CREATE TABLE comment_record (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  pull_request_id TEXT NOT NULL REFERENCES pull_request(id) ON DELETE CASCADE,
  run_id          TEXT REFERENCES run(id) ON DELETE SET NULL,
  github_comment_id BIGINT NOT NULL UNIQUE,
  body_hash       TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- model_trace: planner/summarizer LLM call metadata
CREATE TABLE model_trace (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  run_id          TEXT NOT NULL REFERENCES run(id) ON DELETE CASCADE,
  prompt_name     TEXT NOT NULL,
  model           TEXT NOT NULL,
  input_tokens    INT,
  output_tokens   INT,
  latency_ms      INT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- audit_event: security and workflow audit log
CREATE TABLE audit_event (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  installation_id TEXT REFERENCES installation(id) ON DELETE SET NULL,
  run_id          TEXT REFERENCES run(id) ON DELETE SET NULL,
  event_type      TEXT NOT NULL,
  actor           TEXT,
  payload         JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_event_installation_id ON audit_event(installation_id);
CREATE INDEX idx_audit_event_created_at ON audit_event(created_at);

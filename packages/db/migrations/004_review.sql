-- 004_review
-- Adds tables for the AI PR reviewer: review_record (one per PR review run)
-- and review_finding (individual findings from each specialist agent).

CREATE TABLE review_record (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  pull_request_id     TEXT NOT NULL REFERENCES pull_request(id) ON DELETE CASCADE,
  github_comment_id   BIGINT,
  github_review_id    BIGINT,
  body_hash           TEXT NOT NULL DEFAULT '',
  score               TEXT,        -- 'lgtm' | 'minor' | 'major' | 'block'
  risk_level          TEXT,        -- 'low' | 'medium' | 'high' | 'critical'
  agents_run          INTEGER NOT NULL DEFAULT 0,
  findings_count      INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_review_record_pr ON review_record(pull_request_id);

CREATE TABLE review_finding (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  review_id       TEXT NOT NULL REFERENCES review_record(id) ON DELETE CASCADE,
  agent           TEXT NOT NULL,          -- 'security' | 'logic' | 'type_safety' | 'performance' | 'test_coverage' | 'architecture' | 'documentation'
  severity        TEXT NOT NULL,          -- 'error' | 'warning' | 'info'
  file            TEXT,
  line            INTEGER,
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  suggestion      TEXT,
  confidence      TEXT NOT NULL DEFAULT 'medium',   -- 'high' | 'medium' | 'low'
  status          TEXT NOT NULL DEFAULT 'open',     -- 'open' | 'dismissed' | 'accepted'
  embedding       vector(1536),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_review_finding_review ON review_finding(review_id);
CREATE INDEX idx_review_finding_status ON review_finding(status);

-- HNSW index for semantic similarity search over past findings
CREATE INDEX idx_review_finding_embedding
  ON review_finding
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

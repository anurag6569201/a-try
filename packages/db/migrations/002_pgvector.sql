-- 002_pgvector
-- Enables the pgvector extension and adds a run_embedding table for
-- similarity search over past run summaries.

CREATE EXTENSION IF NOT EXISTS vector;

-- run_embedding: stores one embedding per run (failure summary text)
CREATE TABLE run_embedding (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  run_id          TEXT NOT NULL UNIQUE REFERENCES run(id) ON DELETE CASCADE,
  summary_text    TEXT NOT NULL,
  embedding       vector(1536) NOT NULL,
  model           TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- HNSW index for fast approximate nearest-neighbour search (cosine distance)
CREATE INDEX idx_run_embedding_hnsw
  ON run_embedding
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_run_embedding_run_id ON run_embedding(run_id);

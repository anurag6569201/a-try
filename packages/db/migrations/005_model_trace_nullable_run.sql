-- 005_model_trace_nullable_run
-- Make model_trace.run_id nullable so AI code review agents can log traces
-- without being tied to a specific test run.

ALTER TABLE model_trace
  ALTER COLUMN run_id DROP NOT NULL,
  DROP CONSTRAINT IF EXISTS model_trace_run_id_fkey,
  ADD CONSTRAINT model_trace_run_id_fkey
    FOREIGN KEY (run_id) REFERENCES run(id) ON DELETE CASCADE;

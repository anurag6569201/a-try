-- 003_billing
-- Adds Stripe billing fields to installation and a billing_event log table

ALTER TABLE installation
  ADD COLUMN IF NOT EXISTS stripe_customer_id     TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS billing_cycle_anchor    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS grace_period_ends_at    TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_installation_stripe_customer_id
  ON installation(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_installation_stripe_subscription_id
  ON installation(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- billing_event: immutable log of every Stripe webhook event processed
CREATE TABLE IF NOT EXISTS billing_event (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  installation_id TEXT REFERENCES installation(id) ON DELETE SET NULL,
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type      TEXT NOT NULL,
  payload         JSONB NOT NULL DEFAULT '{}',
  processed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_event_installation_id ON billing_event(installation_id);
CREATE INDEX IF NOT EXISTS idx_billing_event_stripe_event_id ON billing_event(stripe_event_id);

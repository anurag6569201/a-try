# Runbook: False Failure Spike

## Symptoms
- False failure rate exceeds 5% threshold (App Insights alert fires)
- Multiple installations reporting test failures that reproduce as passes on rerun
- `risk_classifier` output skewed toward `flaky` or `environment_issue` across many repos
- Users triggering excessive `/qa rerun` commands (rerun volume alert fires)

## Metrics to Check First

```sql
-- False failure rate in last 24h: runs that failed then passed on rerun
SELECT
  COUNT(*) FILTER (WHERE r1.outcome = 'fail') AS failures,
  COUNT(*) FILTER (WHERE r2.outcome = 'pass') AS recovered,
  ROUND(
    COUNT(*) FILTER (WHERE r2.outcome = 'pass')::numeric /
    NULLIF(COUNT(*) FILTER (WHERE r1.outcome = 'fail'), 0) * 100, 2
  ) AS recovery_rate_pct
FROM result r1
LEFT JOIN result r2 ON r2.run_id != r1.run_id
  AND r2.test_case_id = r1.test_case_id
WHERE r1.created_at > NOW() - INTERVAL '24 hours';
```

## Common Causes and Fixes

### 1. Preview environment instability
- **Signal**: `failure_category = 'environment_issue'` is dominant
- **Check**: Vercel deployment logs for cold start timeouts, 503s
- **Fix**: Increase step timeout config or add a warm-up navigate step in `.previewqa/config.yaml`

### 2. Flaky selector
- **Signal**: Same test case alternates pass/fail across reruns
- **Check**: Screenshot artifacts — is the element intermittently missing?
- **Fix**: Guide user to add a more stable `data-testid` selector

### 3. Network/DNS flap in runner
- **Signal**: Multiple repos failing with `net::ERR_CONNECTION_REFUSED` simultaneously
- **Check**: Azure Container Apps job logs, runner infrastructure health
- **Fix**: Restart Container Apps environment; escalate to Azure support if persistent

### 4. Bad AI summarizer output inflating failures
- **Signal**: `failure_category` suddenly shifts distribution after a recent deploy
- **Fix**: See runbook 01 (Bad Prompt Rollout)

## Escalation

- If false failure rate > 20% for > 30 minutes: page on-call
- Post status update to affected installations via GitHub App comment
- Consider temporarily disabling AI classification and defaulting to `needs_clarification`

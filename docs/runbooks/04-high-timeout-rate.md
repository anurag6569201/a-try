# Runbook: High Timeout Rate

## Symptoms
- App Insights alert: high timeout rate fires (>10% of runs timing out in a 15-minute window)
- Runs accumulating in `waiting_for_preview` or `running` state without completing
- Users seeing `blocked_environment` state in GitHub Checks with no test results

## Immediate Triage

### Check active stuck runs
```sql
SELECT r.id, r.state, r.installation_id, r.created_at,
  NOW() - r.created_at AS age,
  pr.title, pr.head_branch
FROM run r
JOIN pull_request pr ON pr.id = r.pull_request_id
WHERE r.state IN ('waiting_for_preview', 'running', 'planning', 'analyzing')
  AND r.created_at < NOW() - INTERVAL '20 minutes'
ORDER BY r.created_at ASC;
```

### Check timeout distribution
```sql
SELECT
  r.state,
  COUNT(*) AS count,
  AVG(EXTRACT(EPOCH FROM (r.updated_at - r.created_at))) AS avg_seconds
FROM run r
WHERE r.state IN ('blocked_environment', 'failed')
  AND r.created_at > NOW() - INTERVAL '1 hour'
GROUP BY r.state;
```

## Common Causes

### 1. Vercel preview not resolving (`waiting_for_preview`)
- **Signal**: All stuck runs are in `waiting_for_preview`
- **Check**: Vercel API health, `vercel_adapter` logs, deployment status events arriving in Service Bus
- **Fix**: Verify `VERCEL_API_TOKEN` is valid; check if Vercel deployment pipeline is paused

### 2. Playwright runner job crash loop
- **Signal**: Runs move to `running` but never complete; Container Apps job restarts
- **Check**: Azure Container Apps job execution logs
- **Fix**: Check for OOM (increase job memory), Playwright browser crash, or artifact upload failures

### 3. Service Bus queue stuck
- **Signal**: New runs not appearing in DB after webhook receives events
- **Check**: Azure Service Bus queue depth metric in App Insights
- **Fix**: Check Service Bus connection string config; restart orchestrator consumer

### 4. DB connection pool exhausted
- **Signal**: All services logging DB timeout errors simultaneously
- **Fix**: Scale up PostgreSQL max_connections or restart connection pool

## Force-cancel stuck runs

```sql
UPDATE run
SET state = 'canceled', updated_at = NOW()
WHERE state IN ('waiting_for_preview', 'running', 'planning')
  AND created_at < NOW() - INTERVAL '20 minutes';
```

This triggers GitHub Check updates (via orchestrator state transition hooks) to surface the cancellation.

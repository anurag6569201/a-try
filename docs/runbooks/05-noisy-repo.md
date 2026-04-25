# Runbook: Noisy Repo

## Definition

A "noisy repo" is an installation or repository that is consuming disproportionate resources:
- Triggering many runs per hour (rerun abuse, rapid push cadence)
- Holding many concurrent runner jobs (starving other tenants)
- Generating excessive AI prompt calls (inflating cost)
- Posting excessive PR comments

## Detection

### Identify top consumers
```sql
-- Top installations by run count in last hour
SELECT i.account_login, i.tier, COUNT(r.id) AS run_count
FROM run r
JOIN installation i ON i.id = r.installation_id
WHERE r.created_at > NOW() - INTERVAL '1 hour'
GROUP BY i.id, i.account_login, i.tier
ORDER BY run_count DESC
LIMIT 10;
```

### Check rerun abuse
```sql
-- PRs with most reruns in last hour
SELECT pr.title, pr.id, COUNT(r.id) AS rerun_count
FROM run r
JOIN pull_request pr ON pr.id = r.pull_request_id
WHERE r.triggered_by IN ('rerun_command', 'smoke_command')
  AND r.created_at > NOW() - INTERVAL '1 hour'
GROUP BY pr.id, pr.title
ORDER BY rerun_count DESC
LIMIT 10;
```

## Response by Severity

### Level 1: Rate limit already enforced
The orchestrator enforces:
- **Rerun rate limit**: max 5 reruns per PR per hour (see `countRerunsForPRSince`)
- **Concurrency cap**: per tier limit via `TIER_LIMITS[tier].concurrencyCap`
- **Monthly quota**: per tier limit via `TIER_LIMITS[tier].runsPerMonth`

If rate limiting is working, no action needed beyond monitoring.

### Level 2: Legitimate high-volume installation approaching tier limits
- Contact the installation owner proactively about upgrading tier
- Post a friendly upgrade CTA comment (the system does this automatically on quota exceeded)

### Level 3: Abusive or runaway automation
1. **Suspend the installation temporarily**:
   ```sql
   UPDATE installation SET suspended_at = NOW() WHERE id = '<id>';
   ```
   The orchestrator checks `suspended_at` before processing events and drops them.

2. **Cancel all active runs for the installation**:
   ```sql
   UPDATE run SET state = 'canceled', updated_at = NOW()
   WHERE installation_id = '<id>'
     AND state IN ('queued', 'waiting_for_preview', 'planning', 'running', 'analyzing', 'reporting');
   ```

3. **Notify the owner** via GitHub App comment on any open PR, explaining the suspension.

4. **Investigate root cause** — is it a CI loop, a mis-configured webhook, or intentional abuse?

5. **Reinstate** after confirming the issue is resolved:
   ```sql
   UPDATE installation SET suspended_at = NULL WHERE id = '<id>';
   ```

## Prevention

- The concurrency cap and monthly quota are the primary guardrails
- Consider lowering the rerun rate limit (currently 5/hr) if abuse is systemic
- Add an App Insights alert for single-installation run volume > 20 in 10 minutes

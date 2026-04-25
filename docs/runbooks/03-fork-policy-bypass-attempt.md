# Runbook: Fork Policy Bypass Attempt

## What the Policy Does

Fork PRs (where `pull_request.head.repo.fork === true`) are automatically downgraded to smoke-only mode. They cannot access:
- Login profile credentials (Key Vault secrets)
- Instruction-mode YAML parsing (authenticated steps only)
- AI plan suggestions

Every fork policy decision is written to `audit_event` with `event_type = 'fork_policy.downgrade'`.

## Detection

### Signs of a bypass attempt
- A fork PR run with `mode = 'instruction'` or `mode = 'hybrid'` in the `run` table
- A fork PR run accessing login credentials in Key Vault (Key Vault access logs)
- `audit_event` missing a `fork_policy.downgrade` row for a fork PR run

### Query to detect fork runs in non-smoke mode
```sql
SELECT r.id, r.mode, r.sha, pr.is_fork, ae.event_type
FROM run r
JOIN pull_request pr ON pr.id = r.pull_request_id
LEFT JOIN audit_event ae ON ae.run_id = r.id
  AND ae.event_type = 'fork_policy.downgrade'
WHERE pr.is_fork = true
  AND r.mode != 'smoke'
  AND r.created_at > NOW() - INTERVAL '7 days';
```

Expected result: zero rows. Any row here is a bug or bypass.

## Response

1. **Immediately cancel the run**:
   ```sql
   UPDATE run SET state = 'canceled', updated_at = NOW() WHERE id = '<run_id>';
   ```

2. **Check the webhook payload** — was `is_fork` correctly set in the Service Bus envelope?
   Check `audit_event.payload` for the original `pull_request` event.

3. **Check the orchestrator** — verify `isFork` is read from the envelope and passed to `handlePullRequestEvent`.

4. **Write an audit event** manually for the incident:
   ```sql
   INSERT INTO audit_event (installation_id, run_id, event_type, actor, payload)
   VALUES ('<id>', '<run_id>', 'security.fork_bypass_detected', 'system',
     '{"note": "manual investigation triggered"}');
   ```

5. **Review the PR** on GitHub — if the fork author appears malicious, revoke their access.

## Prevention

- `isFork` must always come from `pull_request.head.repo.fork` in the GitHub payload (immutable server-side field)
- Never trust user-controlled input for fork detection
- Fork policy is integration-tested in `apps/orchestrator/src/__tests__/forkPolicy.test.ts`

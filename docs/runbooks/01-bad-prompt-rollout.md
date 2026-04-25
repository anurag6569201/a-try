# Runbook: Bad Prompt Rollout

## Symptoms
- AI failure summaries are nonsensical, empty, or hallucinating incorrect root causes
- Risk classification is consistently wrong (e.g., everything classified as `flaky`)
- PR comments contain model output that does not match the actual test failure
- Regression suite (Sprint 4.4) fails in CI after a prompt or model config change

## Immediate Response

1. **Identify scope** — check which prompt is broken:
   - `failure_summarizer` → affects summary text in PR comments
   - `risk_classifier` → affects failure category badges
   - `plan_normalizer` → affects step generation
   - `plan_suggester` → affects AI suggestion comments

2. **Roll back prompt config** — revert the most recent change to `packages/ai/src/prompts/`:
   ```bash
   git log --oneline packages/ai/src/prompts/
   git revert <commit-sha>
   ```

3. **Re-run regression suite** to confirm rollback fixes the issue:
   ```bash
   pnpm --filter @preview-qa/ai test
   ```

4. **Check `model_trace` table** for recent runs to see raw model inputs/outputs:
   ```sql
   SELECT prompt_name, model, input_tokens, output_tokens, created_at
   FROM model_trace
   WHERE created_at > NOW() - INTERVAL '1 hour'
   ORDER BY created_at DESC
   LIMIT 20;
   ```

5. **Check App Insights** — look for spikes in `model_trace` output_tokens (hallucination often inflates output length).

## Root Cause Investigation

- Compare the failing fixture's expected output against the actual model response in `model_trace`
- Verify model deployment name in config hasn't changed (`config.ai.deployments.*`)
- Check Azure OpenAI service health for the deployment region

## Prevention

- All prompt changes must include fixture updates and pass `pnpm --filter @preview-qa/ai test` in CI
- Never change `model` deployment names without updating fixtures
- Use fixture golden tests as the acceptance gate for any prompt change

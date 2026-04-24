# Summary

<!-- What changed and why? -->

# Related issue / ticket

<!-- Link issue, Linear ticket, Jira ticket, etc. -->

# Risk / impact

- [ ] Low
- [ ] Medium
- [ ] High
- [ ] Visible UI change
- [ ] Auth flow changed
- [ ] Billing / checkout changed
- [ ] Admin / permissions changed
- [ ] No user-facing UI change

# Screenshots / video

<!-- Optional but strongly recommended for UI changes -->

# Preview QA Instructions

<!--
Fill this block so the Preview QA Agent can test the PR preview deployment.

Rules:
- Use `mode: skip` if no UI QA is needed.
- Use `mode: smoke` if generic smoke coverage is enough.
- Use `mode: instruction` if only explicit scenarios should run.
- Use `mode: hybrid` for explicit scenarios + smoke coverage.
- Do not place secrets in this PR.
- Prefer `data-testid` selectors.
-->

<!-- previewqa:start -->
```yaml
version: 1
mode: hybrid
preview_target: auto
login_profile: standard-user
risk_areas:
  - replace-with-area
test_cases:
  - id: QA-01
    name: Replace this example with the real flow
    priority: high
    steps:
      - goto /example
      - click [data-testid=example-button]
    assertions:
      - expect text "Success" visible
out_of_scope:
  - replace-if-needed
notes:
  - Replace this example block with real testing intent
```
<!-- previewqa:end -->

# Checklist

- [ ] Vercel preview exists or will be created for this PR
- [ ] I added or updated Preview QA instructions
- [ ] I added stable selectors (`data-testid`) for new interactive UI
- [ ] I documented known limitations or risky areas
- [ ] I did not place secrets in the PR description
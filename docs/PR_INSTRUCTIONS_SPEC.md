# PR Instructions Specification

## Goal

Define the structured PR contract that Preview QA Agent uses as the canonical source of testing intent.

This is necessary because free-form prose is too ambiguous to reliably convert into deterministic browser execution.

---

## Core rule

The PR description must include a **machine-parseable QA block**.

The parser should only read the content between these markers:

- `<!-- previewqa:start -->`
- `<!-- previewqa:end -->`

Everything outside the markers is human-readable context only.

---

## Required block format

```md
## Preview QA Instructions

<!-- previewqa:start -->
```yaml
version: 1
mode: hybrid
preview_target: auto
login_profile: standard-user
risk_areas:
  - billing
test_cases:
  - id: QA-01
    name: User can create invoice
    priority: high
    steps:
      - goto /billing
      - click [data-testid=create-invoice-button]
      - fill [data-testid=invoice-name-input] with "PR Invoice"
      - click [data-testid=submit-invoice-button]
    assertions:
      - expect text "Invoice created" visible
      - expect url contains /billing
out_of_scope:
  - mobile responsiveness
notes:
  - Use preview sandbox data only
```
<!-- previewqa:end -->
```

---

## Top-level fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `version` | number | yes | contract version; start with `1` |
| `mode` | enum | yes | `skip`, `smoke`, `instruction`, `hybrid`, `full` |
| `preview_target` | string | yes | usually `auto`; can later support explicit preview override |
| `login_profile` | string | no | named auth/session profile from repo config |
| `risk_areas` | string[] | no | helps prioritization and summary |
| `test_cases` | object[] | conditional | required for `instruction` and `hybrid` |
| `out_of_scope` | string[] | no | helps avoid false assumptions |
| `notes` | string[] | no | human context only; not executable steps |

---

## Mode semantics

| Mode | Behavior |
|---|---|
| `skip` | no UI QA run |
| `smoke` | run repo-defined smoke checks |
| `instruction` | run only explicit `test_cases` |
| `hybrid` | run explicit `test_cases` plus repo smoke |
| `full` | run broader repo-defined suite; advanced mode |

---

## Test case schema

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | no | stable reference for reporting |
| `name` | string | yes | concise scenario name |
| `priority` | enum | yes | `low`, `medium`, `high` |
| `steps` | string[] | yes | controlled natural language or step DSL |
| `assertions` | string[] | no | explicit expected outcomes |

---

## Supported v1 step patterns

Preview QA Agent should support a controlled, readable step grammar.

### Navigation
- `goto /path`

### Click
- `click [data-testid=save-button]`

### Fill
- `fill [data-testid=email-input] with "user@example.com"`

### Select
- `select [data-testid=role-select] with "Admin"`

### Wait
- `wait for [data-testid=results-table]`

### Assertion: text visible
- `expect text "Saved successfully" visible`

### Assertion: element visible
- `expect [data-testid=invoice-row] visible`

### Assertion: URL
- `expect url contains /dashboard`

---

## Selector policy

Preferred selector order:

1. `data-testid`
2. accessible role/name selectors
3. stable CSS selectors only if necessary

Do not rely on brittle generated class names.

---

## Auth policy in PR instructions

Use `login_profile` instead of placing credentials in the PR body.

### Example
```yaml
login_profile: standard-user
```

Do **not** put:
- passwords
- access tokens
- session cookies
- secrets
inside the PR body.

---

## Validation rules

### Required
- `version` must be `1`
- `mode` must be valid
- `preview_target` must exist
- `test_cases` required when mode is `instruction` or `hybrid`

### Recommended
- no more than 20 test cases in v1
- no more than 20 steps per case in v1
- use at least one assertion for important business flows
- use `data-testid` for new UI elements

### Reject or flag
- malformed YAML
- unsupported mode
- contradictory steps
- plaintext secrets
- destructive or unsafe actions if not permitted by repo policy

---

## Parser behavior

### If block is present and valid
- normalize into internal plan format
- continue to planning

### If block is present but invalid
- mark `needs_human`
- post parse error details to PR
- do not guess silently

### If block is missing
- if repo policy is strict: mark `needs_human`
- otherwise: run smoke only and recommend adding structured instructions

---

## Good examples

### Good
- “goto /settings”
- “click [data-testid=save-button]”
- “expect text "Profile updated" visible”

### Bad
- “click around and see if it looks okay”
- “test the app thoroughly”
- “make sure everything works”
- “use my personal account”

---

## Example: no UI change

```yaml
version: 1
mode: skip
preview_target: auto
notes:
  - Backend-only change; no UI QA required
```

---

## Example: simple smoke request

```yaml
version: 1
mode: smoke
preview_target: auto
risk_areas:
  - login
  - dashboard
```

---

## Example: explicit instruction mode

```yaml
version: 1
mode: instruction
preview_target: auto
login_profile: standard-user
test_cases:
  - id: QA-01
    name: User can update profile name
    priority: high
    steps:
      - goto /settings/profile
      - fill [data-testid=display-name-input] with "QA Bot"
      - click [data-testid=save-profile-button]
    assertions:
      - expect text "Profile updated" visible
```

---

## v1 limitations

The v1 parser should not attempt to support:
- arbitrary free-form prose as the canonical plan
- file uploads without explicit repo support
- drag/drop flows unless runner supports them
- third-party popups with no stable automation strategy
- destructive admin flows by default

---

## Contract evolution

Future versions may add:
- structured preconditions
- test data aliases
- network assertions
- visual snapshot directives
- explicit wait/retry policies
- route-impact metadata

When changing the contract:
- increment the version
- preserve backward compatibility when possible
- update `PULL_REQUEST_TEMPLATE.md`
- update parser golden tests
<!-- Keep every section; adapt by PR type. Sections marked (optional) may be omitted. See .github/PR_EXAMPLE.md. -->

## Summary

[What was built in this PR]

Closes #[issue-number]

## Acceptance Criteria (optional)

| #   | Criterion   | Status  |
| --- | ----------- | ------- |
| 1   | [criterion] | ✅ / ⬜ |

## What's Included

### [Feature/Module 1]

- [Key changes]

### [Feature/Module 2]

- [Key changes]

### Flow

[Step-by-step internal logic for the main feature/operation]

### New Dependencies (if any)

- [package] — [purpose]

## Design Notes / Rationale (optional)

- [decision] — [why]

## Testing

<!-- List only the test types relevant to this PR. -->

- ✅ [X] API unit tests ([N] new)
- ✅ [X] API e2e tests ([N] new)
- ✅ [X] web tests ([N] new)

## How to Test

<!-- Feature PR: one block per scenario. Non-feature PR: the commands a reviewer runs. -->

### Test 1: [Scenario name]

**Description:** [What is being tested]
**Input:** [User action or curl command]
**Expected Output:** [What should happen / response]
**Why:** [Reason]

### Test 2: [Scenario name]

**Description:** [...]
**Input:** [...]
**Expected Output:** [...]
**Why:** [...]

## Verification Process

### Backend

- [ ] `pnpm type-check`, `pnpm lint`, `pnpm build` pass
- [ ] `pnpm test` (unit) + `pnpm --filter @bookmyturf/api test:e2e` pass
- [ ] Live/API verification where applicable (endpoints exercised against the running API)

### UI

- [ ] `pnpm --filter @bookmyturf/web test` (Vitest) passes; build clean
- [ ] Visual verification in the browser (or N/A with reason, e.g. backend-only PR)

## Documentation

- [Which docs updated]

## Files Changed

- [N] files ([X] new, [Y] modified)

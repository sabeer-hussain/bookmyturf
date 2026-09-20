# PR Description Example

This is a real example of how PR descriptions should be written. Follow this format for all PRs.

> **Note:** this is a **feature** PR (endpoints + UI), so `How to Test` uses user-facing scenarios.
> For **non-feature** PRs (test-infra, refactor, CI, docs-only), keep the same sections but adapt:
> make `How to Test` the commands a reviewer runs, and mark UI/inapplicable sections `N/A` with a
> reason. The template also has two **optional** sections — **Acceptance Criteria** (map the issue's
> criteria to status) and **Design Notes / Rationale** (non-obvious decisions and why) — include
> them when they add value.

---

## Summary

Implements tenant CRUD endpoints and JWT-derived tenant isolation. Turf owners can onboard their business, get a unique slug, and start a 14-day trial.

Closes #11

## What's Included

### Endpoints

| Method | Endpoint               | Auth                 | Description                                  |
| ------ | ---------------------- | -------------------- | -------------------------------------------- |
| POST   | /v1/tenants/onboard    | Bearer               | Complete onboarding (creates tenant + trial) |
| GET    | /v1/tenants/slug/:slug | Public               | Check slug availability                      |
| GET    | /v1/tenants/:id        | Bearer               | Get tenant details (owner/admin)             |
| PATCH  | /v1/tenants/:id        | Bearer               | Update tenant (owner/admin)                  |
| DELETE | /v1/tenants/:id        | Bearer + SUPER_ADMIN | Deactivate tenant (soft delete)              |

### Onboarding Flow

1. Authenticated user calls POST /tenants/onboard with business details
2. Validates slug uniqueness and format
3. Creates tenant record
4. Updates user: role → TURF_OWNER, sets tenantId
5. Creates Subscription (status: TRIAL, 14-day expiry)

### Tenant Isolation (JWT-derived scoping)

- Tenant context comes from the authenticated **JWT** (`tenantId` claim), read via
  `@CurrentUser('tenantId')`
- Each service applies `tenantId` as an **explicit filter** on its queries (Venue, Court, Booking,
  CourtSport, …)
- A cross-tenant request returns `404`/`403` — a user can only reach their own tenant's data

### New Dependencies

- `@nestjs/serve-static` — serve uploaded files in dev mode

## Testing

- ✅ 34 unit tests (12 new: onboard, slug check, findById, deactivate)
- ✅ 26 e2e tests (9 new: all endpoints + authorization checks)

## How to Test

### Test 1: Check slug availability (public)

**Description:** Verify slug availability without authentication
**Input:** `curl http://localhost:4000/v1/tenants/slug/my-turf`
**Expected Output:** `{"success":true,"data":{"available":true,"slug":"my-turf"}}`
**Why:** Public endpoint — users check slug before onboarding

### Test 2: Onboard tenant

**Description:** Complete business setup
**Input:**

```bash
curl -X POST http://localhost:4000/v1/tenants/onboard \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name":"Sport Arena","slug":"sport-arena","phone":"+919876543210","email":"owner@sport.com","city":"Mumbai"}'
```

**Expected Output:** `{"success":true,"data":{"id":"...","name":"Sport Arena","slug":"sport-arena","onboardingComplete":true}}`
**Why:** Creates tenant + changes user role + creates trial subscription

### Test 3: Access denied (wrong tenant)

**Description:** User cannot access another tenant's data
**Input:** `curl http://localhost:4000/v1/tenants/<other-tenant-id> -H "Authorization: Bearer <token>"`
**Expected Output:** `{"statusCode":403,"message":"Access denied","error":"Forbidden"}`
**Why:** Tenant isolation — each user can only access their own tenant

### Test 4: Database verification

**Description:** Confirm data persisted
**Verification:**

```bash
SELECT name, slug FROM tenants;
SELECT phone, role, "tenantId" FROM users;
SELECT status, "trialEndsAt" FROM subscriptions;
```

**Expected Output:** Tenant created, user role updated, subscription with TRIAL status

### Test 5: Onboarding wizard UI

**Description:** User completes onboarding via frontend
**Input:** Visit http://localhost:3000/onboarding → fill Step 1 (name, phone, email) → click Next → type slug → wait for "✓ Available" → click Next → fill City → click Next → review → click "Complete Setup"
**Expected Output:** Spinner on button → green toast "Business setup complete!" → redirects to /bookings → sidebar shows tenant name + all menu items
**Why:** End-to-end frontend flow verifies API integration + UI state management

### Test 6: Mobile responsive

**Description:** UI works on mobile screens
**Input:** Resize browser to <1024px (or DevTools mobile view)
**Expected Output:** Sidebar hidden, hamburger menu visible, content fills screen, cards stack vertically
**Why:** PWA target — must work on mobile devices

### Test 7: Error handling UI

**Description:** Errors shown to user gracefully
**Input:** Try to onboard with a slug that's already taken
**Expected Output:** "✗ Already taken" (red text), Next button stays disabled
**Why:** User gets immediate feedback without submitting form

## Verification Process

### Backend

- [x] `pnpm type-check`, `pnpm lint`, `pnpm build` pass
- [x] `pnpm test` (unit) + `pnpm --filter @bookmyturf/api test:e2e` pass
- [x] Endpoints exercised against the running API (onboard, slug check, get/update/deactivate)

### UI

- [x] `pnpm --filter @bookmyturf/web test` (Vitest) passes; build clean
- [x] Onboarding wizard verified in the browser (desktop + mobile widths)

## Documentation

- Created `docs/4.2-tenant-onboarding.md` — endpoints, isolation architecture, slug rules, flow
- Updated `README.md` — added doc reference

## Files Changed

- 12 files (5 new, 7 modified)

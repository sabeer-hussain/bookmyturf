# Contributing to BookMyTurf

## Conventions

### Commit Messages

- Format: `type: description` (lowercase after colon)
- Types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `style`, `perf`, `ci`
- Examples:
  - `feat: implement otp send/verify + jwt token generation`
  - `fix: regenerate lockfile with public npm registry`
  - `docs: update auth flow documentation`
- Body: bullet points describing key changes
- Footer: `Closes #N` to auto-link/close GitHub issue

### Branch Naming

- `feat/[feature-name]` — new features
- `fix/[bug-description]` — bug fixes
- `chore/[task]` — maintenance tasks
- Examples: `feat/auth-otp`, `feat/tenant-crud`, `fix/cors-image-loading`

### GitHub Issues

**Title:** `feat: [concise description]` (lowercase after colon)

**Labels:** `sprint-N` + `backend`/`frontend` + `[feature-label]`

**Description structure:**

```markdown
## User Stories

- US-X.X: As a [role], I can [action] so that [benefit].

## Acceptance Criteria

- [ ] [Endpoint or feature with specific details]
- [ ] [Validation rules]
- [ ] [Unit + integration tests]

## Technical Details

- [Implementation notes, env vars, dependencies]

## Branch

`feat/[name]`

## Depends On

- #N (if any)
```

### GitHub Labels

**Sprint labels** (one per sprint, different colors):
| Label | Description | Color |
|-------|-------------|-------|
| `sprint-1` | Sprint 1 — Authentication | `#0E8A16` (green) |
| `sprint-2` | Sprint 2 — Tenant Onboarding | `#1D76DB` (blue) |
| `sprint-3` | Sprint 3 — [Feature Name] | `#D93F0B` (orange) |
| `sprint-N` | Sprint N — [Feature Name] | (cycle colors) |

**Layer labels** (permanent):
| Label | Description | Color |
|-------|-------------|-------|
| `backend` | Backend (NestJS API) | `#1D76DB` (blue) |
| `frontend` | Frontend (Next.js) | `#D93F0B` (orange) |

**Feature labels** (one per sprint feature):
| Label | Description | Color |
|-------|-------------|-------|
| `auth` | Authentication feature | `#5319E7` (purple) |
| `onboarding` | Tenant onboarding feature | `#FBCA04` (yellow) |
| (add per sprint) | [Feature] feature | (pick unique color) |

### Milestones

- Title: `Sprint N — [Feature Name]`
- Due date: end of sprint week (1 week per sprint)
- Description: one-line summary of what the sprint delivers
- Close milestone after all issues merged

**Examples:**

- `Sprint 1 — Auth` (due: 2026-06-25) — "Phone OTP + Google OAuth + JWT auth guards + Login UI. User can login and access protected routes."
- `Sprint 2 — Tenant Onboarding` (due: 2026-07-01) — "Turf owner registration, onboarding wizard, dashboard layout, user profile, subscription plans. Owner can register → onboard → access dashboard."

### Issue Planning

- **Order:** backend issues before frontend (APIs ready for UI to consume)
- **Dependencies:** note `Depends On: #N` when one issue requires another
- **Issue numbers:** GitHub shares one counter for issues + PRs (e.g., issues #11-14, PRs #15-18)
- **Per sprint:** each issue should be independently mergeable and leave the app in a working state

**Example issues from Sprint 1:**

- `#3 feat: OTP send/verify + JWT token generation` (labels: sprint-1, backend, auth)
- `#4 feat: JWT strategy, auth guards, and role-based access` (labels: sprint-1, backend, auth) — Depends On: #3
- `#5 feat: Google OAuth token verification` (labels: sprint-1, backend, auth) — Depends On: #3
- `#6 feat: login page UI + auth context + protected routes` (labels: sprint-1, frontend, auth) — Depends On: #3, #5

**Example issues from Sprint 2:**

- `#11 feat: tenant CRUD API + Prisma tenant isolation` (labels: sprint-2, backend, onboarding)
- `#12 feat: user profile API + file upload service` (labels: sprint-2, backend, onboarding)
- `#13 feat: onboarding wizard UI + dashboard layout + profile page` (labels: sprint-2, frontend, onboarding) — Depends On: #11, #12
- `#14 feat: subscription plans seed + API + plan selection UI` (labels: sprint-2, backend, frontend, onboarding) — Depends On: #11

### Pull Requests

**Title:** matches the main commit message (e.g., `feat: tenant CRUD API + Prisma tenant isolation`)

**Examples from this project:**

- `#1 docs: Phase 1 & 2 — requirements gathering & system design`
- `#2 chore: phase 3 — project scaffolding`
- `#7 feat: OTP send/verify + JWT token generation` → Closes #3
- `#8 feat: JWT auth guards, role-based access, and middleware` → Closes #4
- `#9 feat: Google OAuth token verification` → Closes #5
- `#10 feat: login page UI, auth context, and protected routes` → Closes #6
- `#15 feat: tenant CRUD API + Prisma tenant isolation` → Closes #11
- `#16 feat: user profile API + file upload service` → Closes #12
- `#17 feat: onboarding wizard UI + dashboard layout + profile page` → Closes #13
- `#18 feat: subscription plans seed + API + plan selection UI` → Closes #14

**Description structure** (follow `.github/PULL_REQUEST_TEMPLATE.md` for template, see `.github/PR_EXAMPLE.md` for a real filled example). Add extra sections/details wherever necessary — these are minimum required sections, not a limit:

```markdown
## Summary

[What was built + Closes #N]

## What's Included

### [Feature/Module 1]

[Tables, bullet points, key details]

### [Feature/Module 2]

[...]

### New Dependencies (if any)

[List]

## Testing

- ✅ [unit test count]
- ✅ [e2e test count]
- ✅ [web test count]

## How to Test

### Test N: [Description]

**Description:** [What is being tested]
**Input:** [User action or curl command]
**Expected Output:** [What should happen / API response]
**Why:** [Reason this matters]

## Documentation

- [Which docs updated]

## Files Changed

- [Count: N new, M modified]
```

### Testing

- Unit + integration tests alongside each feature (same PR)
- Backend: Jest + Supertest
- Frontend: Vitest + Testing Library
- All tests must pass before merge
- Manual end-to-end verification before marking complete
- Test every feature works visually end-to-end

### Documentation

- `docs/4.X-[feature].md` per sprint/feature area (single file per sprint, sections added incrementally)
- Update README doc list when adding new doc files
- Update `docs/2.6-environment-variables.md` when adding new env vars
- Update `.env.example` files when adding new env vars

### Code Patterns

- **Provider pattern:** dev mock + real implementation, switched via env var (e.g., OTP_PROVIDER, UPLOAD_PROVIDER)
- **Tenant isolation:** AsyncLocalStorage + Prisma middleware (auto-injects tenantId)
- **Response envelope:** All API responses wrapped in `{ success: true, data: ... }`
- **Guards:** Global JwtAuthGuard + RolesGuard (opt-out with @Public())
- **DTOs:** class-validator + @ApiProperty for Swagger
- **Modules:** NestJS modular architecture (controller, service, module, dto)
- **Frontend state:** React Context (auth, tenant) + hooks
- **Components:** shadcn/ui pattern (CVA variants, cn utility)
- **File uploads:** presigned URL pattern (POST /uploads/presigned → PUT file → save URL)

### Development Workflow

1. Read `docs/2.4-sprint-plan.md` for current sprint tasks
2. Read `docs/2.3-api-design.md` for endpoint contracts
3. Read `docs/2.2-database-schema.md` for Prisma models
4. Create GitHub Issue with acceptance criteria
5. Create branch from `main`: `feat/[name]`
6. Implement + write tests
7. Verify all checks: `pnpm type-check && pnpm lint && pnpm test`
8. Manual end-to-end testing (verify visually before marking done)
9. Commit with conventional message + `Closes #N`
10. Push + create PR with detailed description (all test scenarios with input/output/why)
11. CI passes → merge to main
12. Update milestone progress

### Environment

- `OTP_PROVIDER=dev` — logs OTP to console, accepts 123456
- `UPLOAD_PROVIDER=dev` — saves files locally, serves via static route
- `OTP_PROVIDER=msg91` — real SMS via MSG91 API (production)
- `UPLOAD_PROVIDER=s3` — S3 presigned URLs + CloudFront (production)

### Lockfile (pnpm-lock.yaml)

- Must be generated with public npm registry (not Artifactory)
- If local machine uses internal registry (Zscaler/VPN), regenerate outside:
  ```bash
  rm pnpm-lock.yaml && pnpm install
  ```
- `.prettierignore` excludes lockfile from formatting

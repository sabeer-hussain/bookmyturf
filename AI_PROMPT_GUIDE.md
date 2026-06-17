# BookMyTurf — AI Tool Prompt Guide

## How to Use This File
Copy-paste the relevant prompt below when starting a new session with any AI tool (ChatGPT, Claude, Cursor, Copilot, etc.).

---

## Prompt 1: Starting Phase 3 (Project Scaffolding)

```
I'm building BookMyTurf — a multi-tenant SaaS platform for sports turf booking in India.

All design documents are in the `docs/` folder. Read every file in this exact order before doing anything:

1. README.md — Project overview and tech stack
2. docs/1.2-business-discovery.md — All 28 technical decisions and why
3. docs/1.3-design-validation.md — 7 validated design decisions
4. docs/2.0-requirements.md — PRD with user stories and acceptance criteria
5. docs/2.1-folder-structure.md — EXACT monorepo layout to follow
6. docs/2.2-database-schema.md — Complete Prisma schema (16 tables)
7. docs/2.3-api-design.md — All 70+ REST API endpoints
8. docs/2.4-sprint-plan.md — 10-week development plan
9. docs/2.5-architecture-diagram.md — System architecture, flows, cron jobs
10. docs/2.6-environment-variables.md — All environment variables

RULES:
- Follow docs/2.1-folder-structure.md EXACTLY — do not invent your own structure
- Use the Prisma schema from docs/2.2-database-schema.md as-is — do not modify or skip any model
- Implement ALL endpoints from docs/2.3-api-design.md — do not skip any
- Do not add features NOT listed in docs/2.0-requirements.md
- Follow sprint order from docs/2.4-sprint-plan.md
- After completing each step, verify against the relevant doc to confirm nothing is missed
- Use TypeScript everywhere, pnpm as package manager, Turborepo for monorepo

CURRENT STATUS: Phase 1 (Requirements) and Phase 2 (Design) are complete. Start Phase 3 — scaffold the Turborepo monorepo with NestJS backend and Next.js frontend exactly as described in docs/2.1-folder-structure.md.
```

---

## Prompt 2: Continuing Phase 4 (Development — any sprint)

```
I'm building BookMyTurf. All docs are in the `docs/` folder — read them first.

The project is already scaffolded (Phase 3 done). I'm now in Phase 4 (Development).

Current sprint: [WEEK NUMBER] — [SPRINT NAME from docs/2.4-sprint-plan.md]

RULES:
- Implement features for this sprint ONLY (from docs/2.4-sprint-plan.md)
- Each feature must satisfy the user story acceptance criteria in docs/2.0-requirements.md
- API endpoints must match docs/2.3-api-design.md exactly (method, path, auth, role, response format)
- Database queries must use the Prisma schema from docs/2.2-database-schema.md
- Multi-tenancy: Every tenant-scoped query MUST include tenantId filter
- Follow existing code patterns in the codebase — do not introduce new libraries or patterns
- Write unit tests for business logic, integration tests for API endpoints
- After implementing each feature, verify it matches the acceptance criteria in docs/2.0-requirements.md
```

---

## Prompt 3: Bug Fix or Feature Addition (Post-MVP)

```
I'm building BookMyTurf. All docs are in the `docs/` folder — read them first.

The project is live. I need to [describe what you need].

RULES:
- Read existing code first before making changes
- Follow existing patterns, naming conventions, and folder structure
- Ensure tenant isolation is maintained (tenantId on all queries)
- Do not break existing API contracts from docs/2.3-api-design.md
- Write tests for any new/modified code
- If the change impacts the database schema, create a Prisma migration
```

---

## Prompt 4: Code Review

```
I'm building BookMyTurf. Review the following code against:

1. docs/2.3-api-design.md — Does it match the API contract?
2. docs/2.2-database-schema.md — Are all fields and relations correct?
3. docs/2.0-requirements.md — Does it satisfy the user story acceptance criteria?
4. Security: tenant isolation, input validation, auth guards
5. Performance: N+1 queries, missing indexes, unnecessary data fetching

Point out any deviations, missing validations, or potential issues.
```

---

## Prompt 5: Resume After Break (New Session)

```
I'm building BookMyTurf — a multi-tenant SaaS for sports turf booking.

All documentation is in the `docs/` folder. Read README.md first, then all docs.

The project is at [DESCRIBE CURRENT STATE — e.g., "Phase 4 Week 5, booking API done, payments not started"].

Read the existing codebase to understand what's already built, then continue from where I left off. Follow docs/2.4-sprint-plan.md for what comes next.

RULES:
- Do not redo work that's already done
- Follow existing patterns in the codebase
- Verify against docs before and after each implementation
- Do not skip any feature or endpoint
```

---

## Key Principles for Any AI Tool

1. **Docs are the single source of truth** — if the AI suggests something different from the docs, the docs win
2. **Verify after every step** — ask the AI to confirm completeness against the relevant doc
3. **One sprint at a time** — don't let the AI jump ahead or skip sprints
4. **No scope creep** — if it's not in `2.0-requirements.md`, it doesn't get built in MVP
5. **Tenant isolation always** — every query, every API, every test must respect multi-tenancy

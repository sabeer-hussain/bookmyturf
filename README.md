# BookMyTurf

**India's sports turf booking & management platform (Multi-tenant SaaS)**

## Product Summary

- **What:** A platform where sports turf owners manage bookings digitally, and customers discover & book turf slots online.
- **Who:** Turf owners (B2B) + sports players (B2C) in India
- **Market:** India (metro + tier-1/2 cities), English with i18n ready for Hindi/regional languages
- **Revenue:** Subscription (₹999-4999/month from turf owners) + Commission (3-8% on online bookings)
- **URL Structure:** `bookmyturf.in/[turf-owner-slug]`
- **Team:** Solo developer + AI assistance
- **Timeline:** 10 weeks to MVP
- **Budget:** Start at $0 (AWS free tier), scale with revenue
- **Mobile:** Progressive Web App (PWA) — no native app for MVP
- **MVP Scope:** Standard — booking + notifications + analytics + multi-court (not lean, not feature-rich)

## User Roles

| Role         | Access                                                  |
| ------------ | ------------------------------------------------------- |
| Super Admin  | Platform-wide management (you)                          |
| Turf Owner   | Full tenant admin (venues, courts, billing, analytics)  |
| Turf Manager | Day-to-day operations (bookings, slots, staff check-in) |
| Turf Staff   | Ground-level (mark attendance, check-in only)           |
| Customer     | Browse, book, pay, view history                         |

## Tech Stack (with reasoning)

| Layer         | Technology                                      | Why chosen                                                                                        |
| ------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Frontend      | Next.js 14+ (App Router) + Tailwind + shadcn/ui | SSR for SEO on public booking pages, PWA support, shared TypeScript with backend                  |
| Backend       | NestJS + TypeScript                             | Enterprise-grade structure (modules, guards, interceptors) ideal for multi-tenant SaaS            |
| Database      | PostgreSQL (AWS RDS) + Prisma ORM               | Row-Level Security for tenant isolation, ACID for no double-booking, Prisma for type-safe queries |
| Cache         | Redis (ElastiCache)                             | OTP storage, slot availability cache, rate limiting counters                                      |
| Auth          | Phone OTP + Google OAuth + JWT                  | Indian market prefers phone login; Google as frictionless alternative                             |
| Payments      | Razorpay                                        | Best Indian gateway; Route API for commission split; Subscriptions API for billing                |
| Notifications | WhatsApp Business API + Email (Resend)          | WhatsApp has 98% open rate in India; email for formal receipts                                    |
| Hosting       | AWS (Amplify + App Runner + RDS)                | Free tier first year ($0), no future migration needed, scales with business                       |
| Monorepo      | Turborepo + pnpm                                | Shared TypeScript types, single CI/CD, faster builds                                              |
| CI/CD         | GitHub Actions                                  | Free 2000 min/month, huge marketplace, easy AWS integration                                       |
| Testing       | Jest + Supertest + Playwright                   | Standard testing pyramid: unit + integration + E2E                                                |
| Multi-tenancy | Shared DB, shared schema (tenant_id)            | Cheapest, simplest, sufficient for 100s of tenants                                                |

**Hosting decision:** Evaluated Vercel+Railway ($60/yr) vs AWS ($0 first year). Chose AWS because: zero cost Year 1, no migration needed at scale, App Runner gives Vercel-like simplicity.

## Quick Context (for AI tools / new developers)

Read the `docs/` folder in this order:

**Phase 1 — Requirements Gathering (Research → Decisions → Validation):**

1. `docs/1.0-customer-research.md` — 56 interview questions for turf owners (understand the problem)
2. `docs/1.0-customer-research.xlsx` — Excel tracker for field interviews (3 sheets with samples)
3. `docs/1.1-competitor-analysis.md` — Market landscape, 6 competitors analyzed, our differentiation
4. `docs/1.2-business-discovery.md` — 28 tech/business decisions with reasoning (solve the problem)
5. `docs/1.3-design-validation.md` — 7 design decisions validated post-discovery

**Phase 2 — System Design & Architecture:** 6. `docs/2.0-requirements.md` — PRD (user stories, acceptance criteria, NFRs) 7. `docs/2.1-folder-structure.md` — Monorepo layout (all folders and files) 8. `docs/2.2-database-schema.md` — Prisma schema (16 tables, enums, indexes) 9. `docs/2.3-api-design.md` — REST API (19 modules, 70+ endpoints) 10. `docs/2.4-sprint-plan.md` — 10-week development plan (daily tasks) 11. `docs/2.5-architecture-diagram.md` — System architecture + cron jobs + flows 12. `docs/2.6-environment-variables.md` — All env vars (API, Web, Docker)

**Phase 3 — Project Scaffolding:** 13. `docs/3.0-project-scaffolding.md` — What was set up, tech versions, commands, how to extend

**Phase 4 — Implementation:** 14. `docs/4.1-auth-flow.md` — Auth system (OTP, JWT, refresh tokens, rate limiting) 15. `docs/4.2-tenant-onboarding.md` — Tenant onboarding (CRUD, isolation, slug, trial)

**Visual diagrams:**

- `docs/2.2-dbdiagram.dbml` — Paste at [dbdiagram.io](https://dbdiagram.io) for ER diagram
- `docs/2.5-architecture-eraser.txt` — Paste at [eraser.io](https://app.eraser.io) for architecture diagram
- `docs/2.5-architecture-drawio.md` — Use at [draw.io](https://app.diagrams.net) or [excalidraw.com](https://excalidraw.com) for architecture + booking flow + CI/CD diagrams

## Key Design Decisions

| Decision                   | Choice                                                          |
| -------------------------- | --------------------------------------------------------------- |
| Multiple venues per tenant | Yes                                                             |
| Booking flow               | Online (10-min hold + Razorpay) + Offline (walk-in by staff)    |
| Slot duration              | Configurable per court-sport (30min, 60min, etc.)               |
| Customer account           | Browse free, login only at checkout                             |
| Tenant onboarding          | Self-serve + 14-day free trial (no approval needed)             |
| Data protection            | Automated backups + Point-in-time recovery + Soft deletes       |
| Pricing display            | All-inclusive (platform commission hidden from customer)        |
| Cancellation               | Turf owner configurable (Flexible / Moderate / Strict / Custom) |
| Multi-sport                | One court can support multiple sports with independent pricing  |
| Booking slots              | Hybrid — fixed base slots + consecutive multi-slot booking      |

## Security & Monitoring

| Area              | Tools/Approach                                          |
| ----------------- | ------------------------------------------------------- |
| Error tracking    | Sentry (free tier)                                      |
| Logs & alarms     | AWS CloudWatch                                          |
| Uptime monitoring | BetterUptime                                            |
| Security headers  | Helmet.js                                               |
| Rate limiting     | @nestjs/throttler (per IP + per tenant)                 |
| Input validation  | class-validator + class-transformer                     |
| CORS              | Configured per allowed origins                          |
| SQL injection     | Prisma parameterized queries (built-in)                 |
| XSS               | Next.js auto-escaping + DOMPurify                       |
| Auth tokens       | JWT (15min access) + refresh token rotation (7 days)    |
| Tenant isolation  | Prisma middleware auto-injects tenant_id on every query |

## Current Status

- [x] Phase 1: Requirements Gathering — Complete
- [x] Phase 2: System Design & Architecture — Complete
- [x] Phase 3: Project Setup & Scaffolding — Complete
- [ ] Phase 4: Development (Sprint-wise) — Next
- [ ] Phase 5: Testing
- [ ] Phase 6: Deployment
- [ ] Phase 7: Launch

## Prompt for AI Tools

If using ChatGPT, Cursor, Copilot, or any AI assistant, use this prompt:

> I'm building BookMyTurf — a multi-tenant SaaS for sports turf booking in India. All design documents are in the `docs/` folder. Read them all first. I'm currently at Phase 4 (Development). The project is already scaffolded. Help me implement features sprint by sprint following docs/2.4-sprint-plan.md. Use existing code patterns, follow docs/2.3-api-design.md for endpoints, and docs/2.2-database-schema.md for Prisma models.

## How to Run Locally

### Prerequisites

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- Docker & Docker Compose

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/sabeer-hussain/bookmyturf.git
cd bookmyturf

# 2. Install dependencies
pnpm install

# 3. Start PostgreSQL + Redis
docker-compose up -d

# 4. Setup environment variables
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# 5. Run database migration
cd apps/api && pnpm prisma migrate dev

# 6. Start development
pnpm dev
```

### Access

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:4000
- **Swagger Docs:** http://localhost:4000/api/docs

### Useful Commands

```bash
pnpm dev          # Start all apps in dev mode
pnpm build        # Build all apps
pnpm lint         # Lint all apps
pnpm type-check   # TypeScript check
pnpm test         # Run tests
docker-compose up -d   # Start DB + Redis
docker-compose down    # Stop DB + Redis
```

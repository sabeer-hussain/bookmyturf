# Sprint 4 — Slot Configuration (GitHub Setup)

---

## Labels to Create

| Label      | Description                               | Color     |
| ---------- | ----------------------------------------- | --------- |
| `sprint-4` | Sprint 4 — Slot Configuration             | `#B60205` |
| `slots`    | Slot configuration & availability feature | `#006B75` |

---

## Milestone

- **Title:** Sprint 4 — Slot Configuration
- **Due date:** 2026-07-19
- **Description:** Slot config CRUD, bulk week generation, peak/off-peak, overlap & alignment validation, availability computation, weekly-grid management UI. Owner can configure bookable slots per court-sport per weekday.

---

---

---

## Issue #28

**Title:** `feat: slot config CRUD API + bulk generation + peak/overlap validation`

**Labels:** `sprint-4`, `backend`, `slots`

**Milestone:** Sprint 4 — Slot Configuration

**Body (copy below):**

---

## User Stories

- US-4.1: As a turf owner, I can configure time slots per court-sport per day so that availability is defined for customers.
- US-4.2: As a turf owner, I can bulk-generate slots from open/close time so that I don't create slots one by one.
- US-4.3: As a turf owner, I can mark peak/off-peak hours so that pricing adjusts automatically.
- US-4.4: As a turf owner, I can set different slot durations per sport so that badminton=30min, cricket=1hr.
- US-4.5: As a system, I prevent overlapping slots so that there are no scheduling conflicts.

## Acceptance Criteria

- [ ] `POST /court-sports/:courtSportId/slots` — create one or more slot configs (dayOfWeek, startTime, endTime, isPeakHour)
- [ ] `GET /court-sports/:courtSportId/slots` — list slot configs as a **flat array ordered by dayOfWeek (MON→SUN) then startTime**
- [ ] `PATCH /slot-configs/:id` — update a slot config (startTime, endTime, isPeakHour, isActive)
- [ ] `DELETE /slot-configs/:id` — delete a slot config (hard delete)
- [ ] `POST /court-sports/:courtSportId/slots/bulk` — bulk create slots for the week from an explicit `{ slots: [...] }` array
- [ ] Validation — startTime/endTime: `HH:mm` 24hr format; `startTime < endTime`
- [ ] Validation — dayOfWeek: must be a valid `DayOfWeek` enum value
- [ ] Validation — within venue hours: slot must fall within the venue's `openTime`/`closeTime`
- [ ] Validation — alignment: each slot's duration must be a **positive integer multiple of the court-sport's `baseSlotMinutes`**
- [ ] Validation — no overlap: reject slot configs whose time ranges overlap for the **same court-sport + same dayOfWeek**
- [ ] Peak pricing rule: `isPeakHour` is a flag only; if `isPeakHour=true` but no `peakPricePerSlot`, price falls back to base `pricePerSlot` (no rejection)
- [ ] Bulk behavior: all-or-nothing — wrap inserts in a transaction; if any slot fails validation, reject the entire batch
- [ ] Tenant isolation: verify the court-sport belongs to the current tenant via `courtSport → court → venue → tenantId` (manual filter)
- [ ] Roles: create/get/update/delete = `TURF_OWNER`, `TURF_MANAGER`; bulk = `TURF_OWNER` only
- [ ] Register `SlotsModule` in `app.module.ts`
- [ ] DTOs with `class-validator` + `@ApiProperty` for Swagger
- [ ] Unit tests for SlotsService (CRUD, bulk, overlap, alignment, within-hours, tenant isolation, peak fallback)

## Technical Details

- Prisma `SlotConfig` model already migrated. No schema change.
- Reference: `docs/2.3-api-design.md` §8, `docs/2.0-requirements.md` Epic 4, `docs/2.2-database-schema.md` (SlotConfig).
- DTOs: `create-slot-config.dto.ts`, `update-slot-config.dto.ts`, `bulk-create-slots.dto.ts`. (Deviation from folder-structure doc's `create-slot.dto.ts` naming — matches entity/route.)
- Add pure, unit-tested `generateSlots(openTime, closeTime, baseSlotMinutes, peakRanges)` + `HH:mm ↔ minutes` helpers (reused by frontend in the UI issue).
- Tenant scoping via JWT `@CurrentUser('tenantId')`, NOT the `X-Tenant-Id` header.
- Error style: raw NestJS exceptions with a `code` in the body (consistent with `VENUE_LIMIT_REACHED`); documented error envelope deferred.
- Response envelope: existing `TransformInterceptor` wraps to `{ success: true, data }`.

## Branch

`feat/slot-config-api`

## Depends On

- None

## Clarifications (decided during pre-implementation analysis)

**Delete semantics (Q1):**

- `DELETE /slot-configs/:id` performs a **hard delete** (row removed), mirroring `CourtSport.remove()`. Safe because bookings are self-contained (`BookingSlot` stores its own times; no FK to `SlotConfig`), so deleting a config never orphans a booking.
- `PATCH /slot-configs/:id` `isActive` is a **separate enable/disable toggle** (temporarily disable a slot without deleting its config).
- `GET .../slots` and availability computation filter to `isActive: true`.

**Overnight hours limitation (Q2):**

- Within-hours validation assumes **same-day** operating windows: `openTime ≤ slot.start < slot.end ≤ closeTime`.
- **Out of scope for Sprint 4:** venues operating past midnight (`closeTime < openTime`, e.g., 18:00→02:00). This is a known limitation because post-midnight slots also affect Sprint 5 availability + booking-date assignment, so it must be designed holistically.
- Recorded as a deferred backlog item in `docs/4.4-slot-configuration.md` (not filed as a separate GitHub issue yet).

---

---

---

## Issue #29

**Title:** `feat: slot availability computation + shared slot types`

**Labels:** `sprint-4`, `backend`, `slots`

**Milestone:** Sprint 4 — Slot Configuration

**Body (copy below):**

---

## User Stories

- US-4.1: As a turf owner, I can configure time slots per court-sport per day so that availability is defined for customers.
- Supports US-5.2 (Sprint 5): customer sees available slots for a date — the public endpoint will reuse this logic.

## Acceptance Criteria

### Availability computation

- [ ] Implement reusable, pure `SlotsService.computeAvailability(tenantId, courtSportId, date)`
- [ ] Enforce tenant ownership via `courtSport → court → venue → tenantId`; throw `NotFound` if the court-sport doesn't belong to the tenant (or is inactive)
- [ ] Resolve the weekday from `date` **timezone-agnostically** (parse `YYYY-MM-DD` by calendar components; independent of server timezone — no off-by-one)
- [ ] Load active `SlotConfig`s for that court-sport + resolved weekday (`isActive: true`)
- [ ] Expand configs into a slot grid; **order slots by `startTime` ascending**
- [ ] Attach `price` per slot: `peakPricePerSlot` when `isPeakHour === true` **and** set, otherwise base `pricePerSlot` (Decimal → number)
- [ ] Set every slot `status = AVAILABLE` (`SlotStatus` enum). Bookings do not exist yet — see booked-subtraction seam below
- [ ] Return the documented shape (matches `docs/2.3-api-design.md` §9): `{ date, courtSport: { id, sportName, pricePerSlot }, slots: [{ startTime, endTime, status, price }] }` where `sportName` comes from the `sport` relation and `pricePerSlot` is the base price (Decimal → number)
- [ ] Empty-config day returns `slots: []`
- [ ] **Full deterministic grid** — no past-date / lead-time / current-time filtering (that is a Sprint 5 booking concern; keeps this method pure & testable)
- [ ] **Booked-subtraction seam:** structure the computation so Sprint 5 can subtract booked `BookingSlot`s (marking `status = BOOKED`) without refactor; the seam returns none for now

### Scope boundaries

- [ ] **No public HTTP endpoint this sprint** — the public `GET /public/:tenantSlug/availability` is delivered in Sprint 5 and will call this method unchanged
- [ ] Owner-facing preview is rendered **client-side** in the UI issue (#30) by expanding fetched configs; not a server route here
- [ ] Cross-sport court contention is a Sprint 5 booking-lock concern (keyed on physical `courtId`) — not enforced here

### Shared types (reuse, no duplication)

- [ ] Reuse existing `SlotStatus` and `DayOfWeek` enums from `packages/shared/src/constants/enums.ts` (do **not** create a duplicate `slot-status.ts`)
- [ ] Add `packages/shared/src/types/slot.types.ts` with `IAvailabilityResponse` (and slot-grid item type), importing `SlotStatus`
- [ ] Refine existing `ISlotAvailability.status` (in `types/booking.types.ts`) to use the `SlotStatus` enum instead of `string`
- [ ] Export new types from `packages/shared/src/index.ts`

### DTO

- [ ] Add `slot-availability.dto.ts` with `AvailabilityQueryDto` (`date` validated as `YYYY-MM-DD`) for Sprint 5 reuse

### Testing

- [ ] Unit tests: weekday resolution (known dates → correct weekday, TZ-agnostic), peak vs base pricing, null-peak-price fallback to base, empty-config day, Decimal → number, slot ordering, tenant-not-found, booked-subtraction seam returns none
- [ ] Verification: full unit coverage + a throwaway script invoking the real method against the seeded DB (deleted after) — no committed test-only code

## Technical Details

- Reference: `docs/2.3-api-design.md` §9 (availability response shape), `docs/2.1-folder-structure.md` (shared slot types).
- Reuse `slot-time.util.ts` and the tenant-scoped court-sport load pattern from #28; extend the court-sport `include` to also load `sport` (for `sportName`).
- `SlotConfig` are recurring per-weekday templates; availability is computed on the fly (not materialized).
- Note the deviation from `docs/2.1`'s literal `slot-status.ts`: the `SlotStatus` enum already lives in the shared `constants/enums.ts` (the correct, centralized home), so no separate file is created.

## Branch

`feat/slot-availability-api`

## Depends On

- #28

---

---

---

## Issue #30

**Title:** `feat: slot configuration UI + weekly grid + bulk generator + availability preview`

**Labels:** `sprint-4`, `frontend`, `slots`

**Milestone:** Sprint 4 — Slot Configuration

**Body (copy below):**

---

## User Stories

- US-4.1: As a turf owner, I can configure time slots per court-sport per day so that availability is defined for customers.
- US-4.2: As a turf owner, I can bulk-generate slots so that I don't create them one by one.
- US-4.3: As a turf owner, I can mark peak/off-peak hours so that pricing adjusts.
- US-4.4: As a turf owner, I can set different slot durations per sport (via `baseSlotMinutes`).

## Prerequisite refactor — move slot time util to shared

- [ ] Move the pure, framework-free time util (`generateSlots`, `toMinutes`/`fromMinutes`, `durationMinutes`, `rangesOverlap`, `findFirstOverlap`, `isWithinOperatingHours`, `isAlignedToBase`, `resolveWeekday`, `HH_MM_REGEX`, `YYYY_MM_DD_REGEX`) from `apps/api/src/modules/slots/slot-time.util.ts` into `packages/shared` (single source of truth for slot logic across API + web)
- [ ] Move its unit spec alongside; export from `packages/shared/src/index.ts`
- [ ] Update API imports (`slots.service.ts`, `dto/*`) to `@bookmyturf/shared`; verify API suite still passes (178 unit + 85 e2e — no behavior change)
- [ ] Web consumes it via existing `transpilePackages: ['@bookmyturf/shared']` (already configured)

## Acceptance Criteria

### Route & Navigation

- [ ] Contextual nested route `/venues/[id]/courts/[courtId]/sports/[courtSportId]/slots` (matches the existing venue → court → sport drill-down)
- [ ] "Configure Slots" button on each court-sport card in the court detail page → opens this route
- [ ] Deviation from `docs/2.1`'s standalone `slots/page.tsx` (contextual chosen; documented)
- [ ] Reusable `slot-picker.tsx` component (the weekly grid)

### Weekly Grid — grid-toggle model (US-4.1)

- [ ] Grid generated from the venue's `openTime`/`closeTime` sliced by the court-sport's `baseSlotMinutes` (via shared `generateSlots`), so every slot is base-aligned and within hours by construction
- [ ] Fetch existing configs via `GET /court-sports/:courtSportId/slots` (flat array); reconcile against the generated grid (existing slots shown active)
- [ ] Owner toggles each slot **active/off** and **peak/off-peak** directly on the grid
- [ ] Mon–Sun layout, grouped by weekday
- [ ] Empty state with CTA when no slots configured
- [ ] Manual add/edit uses a base-aligned time dropdown (options stepped by `baseSlotMinutes` within venue hours) so manual picks are aligned by design

### Save model — granular per-slot (uses #28 endpoints)

- [ ] Enable a grid slot → `POST /court-sports/:courtSportId/slots`
- [ ] Toggle peak / active on an existing slot → `PATCH /slot-configs/:id`
- [ ] Remove a slot → `DELETE /slot-configs/:id` (with `ConfirmDialog`)
- [ ] Optimistic UI + toast per action (mirrors the court page's per-item pattern)

### Bulk Auto-Generate (US-4.2)

- [ ] "Auto-generate slots" builds the array via shared `generateSlots(openTime, closeTime, baseSlotMinutes, peakRanges)`
- [ ] Preview the generated grid before submitting
- [ ] Submit via `POST /court-sports/:courtSportId/slots/bulk` (explicit `{ slots: [...] }`)
- [ ] Idempotent: generate only slots that don't already exist (skip existing → no `SLOT_OVERLAP`)
- [ ] Generated slots default to off-peak; owner toggles peaks on the grid afterward

### Peak Highlighting (US-4.3)

- [ ] Peak slots visually highlighted (distinct color/badge)
- [ ] Soft hint when a slot is marked peak but the court-sport has no `peakPricePerSlot` set

### Availability Preview (client-side, minimal — customer view)

- [ ] Date picker → resolves the weekday → renders that weekday's slots read-only with computed peak/base prices, labeled Available
- [ ] Reuses the grid data + shared util (no HTTP availability endpoint this sprint)
- [ ] Note: in Sprint 4 the preview reflects configuration only (all Available); it becomes true availability in Sprint 5 when bookings + the public endpoint exist

### UI Quality

- [ ] Reuse shadcn/ui (`Card`, `Button`, `Badge`, `Dialog`, `Checkbox`, `Select`) + existing `time-select.tsx` / `price-input.tsx` / `empty-state.tsx` / `confirm-dialog.tsx` / `toast`
- [ ] Loading skeletons; responsive (320px+); keyboard/ARIA accessible
- [ ] Client-side validation mirroring backend (HH:mm, start<end, multiple-of-`baseSlotMinutes`, within venue hours) using the shared util — invalid input prevented by construction

### Testing (Vitest)

- [ ] Grid renders from venue hours ÷ base
- [ ] Auto-generate builds the correct preview (via shared `generateSlots`)
- [ ] Peak toggle fires `PATCH` (mocked api-client)
- [ ] Client-side validation rejects misaligned / out-of-hours
- [ ] Empty state renders

## Technical Details

- Reference: `docs/2.4-sprint-plan.md` Sprint 4 D4–D5, `docs/2.1-folder-structure.md` (`slot-picker.tsx`), `docs/1.0-customer-research.md` Q17 (calendar/click-grid, "block a slot quickly").
- Use existing `lib/api-client.ts` (`api.get/post/patch/delete`, `{ success, data }` envelope). Fetch the venue detail for `openTime`/`closeTime` to bound the grid.
- Prices are serialized as strings (Prisma Decimal) in responses — handle in the peak hint.
- Pattern reference: `dashboard/court-sport-form-modal.tsx`, court detail page conventions.
- Verification: type-check, lint, Vitest, API suite (post-refactor), build, **and visual end-to-end** (run API + web; navigate → grid → add slot → auto-generate → peak toggle → preview).

## Out of Scope / Backlog (noted)

- `PUT .../slots` replace-week bulk-upsert (would simplify save; future backend)
- Upfront peak-range input in auto-generate (toggle-on-grid for now)
- "Copy this day to other days" convenience helper
- Public availability HTTP endpoint (Sprint 5); real booked-slot status (Sprint 5)

## Branch

`feat/slot-config-ui`

## Depends On

- #28, #29

---

---

---

## Issue #31

**Title:** `feat: slot config integration tests + docs + CI Postgres service`

**Labels:** `sprint-4`, `backend`, `slots`

**Milestone:** Sprint 4 — Slot Configuration

**Body (copy below):**

---

## User Stories

- All US-4.X stories validated end-to-end.

## Acceptance Criteria

### Integration Tests (Supertest, real DB)

- [ ] Full slot-config lifecycle: create → list → update → delete
- [ ] Bulk creation: valid week generated and persisted
- [ ] Overlap rejection (same court-sport + day)
- [ ] Alignment rejection (duration not a multiple of `baseSlotMinutes`)
- [ ] Within-hours rejection (outside venue open/close)
- [ ] Bulk all-or-nothing: one invalid slot rejects the whole batch (nothing persisted)
- [ ] Tenant isolation: tenant A cannot create/list/update/delete tenant B's slot configs
- [ ] Role enforcement: `TURF_STAFF`/`CUSTOMER` cannot create; bulk restricted to `TURF_OWNER`
- [ ] Availability computation returns correct slots + peak/base pricing for a date

### Bundled fix (tech-debt H3)

- [ ] Update `apps/api/.env.example` JWT secrets to the value e2e tests expect (`dev-access-secret-change-in-production-32`) so `pnpm test:e2e` passes out-of-the-box
- [ ] Update `docs/2.6-environment-variables.md` accordingly

### CI

- [ ] Add a PostgreSQL service + `pnpm test` step to `.github/workflows/ci.yml` (currently only lint/type-check/build; no DB, no tests)

### Docs

- [ ] Create `docs/4.4-slot-configuration.md` (endpoints + examples, bulk payload + all-or-nothing, validation rules, peak fallback, availability computation, flat-array list shape, frontend routes/components, DTO naming deviation, testing summary)
- [ ] Update README doc list to include `docs/4.4-slot-configuration.md`
- [ ] Record cross-check corrections: tenant scoping = JWT (not `X-Tenant-Id`), error-envelope deferral, availability S4/S5 split, and note deferred tech-debt (exception filter, tenant-middleware) + backlog (maintenance blocking)

### Gates

- [ ] `pnpm type-check`, `pnpm lint`, `pnpm test`, `pnpm test:e2e` all pass
- [ ] Manual E2E: configure slots → bulk generate → preview availability

## Technical Details

- Reference: `docs/2.4-sprint-plan.md` Sprint 4 D6, CONTRIBUTING.md testing section, existing `test/courts.e2e-spec.ts`, `.github/workflows/ci.yml`.
- e2e runs against Docker Postgres+Redis locally; CI uses a `postgres:16` service container.

## Branch

`feat/slot-tests`

## Depends On

- #28, #29, #30

---

---

---

## Execution Order

| Order | Issue | Title                                   | Branch                       | PR  | Closes |
| ----- | ----- | --------------------------------------- | ---------------------------- | --- | ------ |
| 1     | #28   | Slot config CRUD + bulk + validation    | `feat/slot-config-api`       | #32 | #28    |
| 2     | #29   | Availability computation + shared types | `feat/slot-availability-api` | #33 | #29    |
| 3     | #30   | Slot config UI + weekly grid + preview  | `feat/slot-config-ui`        | #34 | #30    |
| 4     | #31   | Integration tests + docs + CI Postgres  | `feat/slot-tests`            | —   | #31    |

---

## Sprint 4 Completion Checklist

- [ ] All 4 issues closed
- [ ] All 4 PRs merged to main
- [ ] pnpm test — all pass
- [ ] pnpm type-check — clean
- [ ] pnpm lint — clean
- [ ] pnpm test:e2e — all pass (real Postgres)
- [ ] Manual E2E verified visually
- [ ] docs/4.4-slot-configuration.md created
- [ ] Milestone closed

# Sprint 3 — Venue & Court Management (GitHub Setup)

---

## Labels to Create

| Label      | Description                         | Color     |
| ---------- | ----------------------------------- | --------- |
| `sprint-3` | Sprint 3 — Venue & Court Management | `#D93F0B` |
| `venues`   | Venue & court management feature    | `#0075CA` |

---

## Milestone

- **Title:** Sprint 3 — Venue & Court Management
- **Due date:** 2026-07-13
- **Description:** Venue CRUD, court CRUD, sports master data, court-sport configuration, plan limit enforcement, image upload, management UI. Owner can add venues → courts → assign sports with pricing.

---

---

---

## Issue #20

**Title:** `feat: venue CRUD API + subscription plan limit enforcement`

**Labels:** `sprint-3`, `backend`, `venues`

**Milestone:** Sprint 3 — Venue & Court Management

**Body (copy below):**

---

## User Stories

- US-3.1: As a turf owner, I can add a venue with address and amenities so that customers know my location and facilities.
- US-3.6: As a system, I enforce plan limits so that tenants don't exceed their subscription.

## Acceptance Criteria

- [ ] POST /venues — create venue (name, address, city, state, pincode, openTime, closeTime, amenities, images, phone, lat/lng)
- [ ] GET /venues — list tenant's venues (tenant-scoped via middleware)
- [ ] GET /venues/:id — get venue details (with courts count)
- [ ] PATCH /venues/:id — update venue
- [ ] DELETE /venues/:id — soft deactivate (isActive = false)
- [ ] Subscription plan limit enforced: reject with VENUE_LIMIT_REACHED (403) if maxVenues exceeded
- [ ] Amenities validated against predefined list: drinking_water, washroom, changing_room, parking, floodlights, seating_area, cctv, first_aid, cafeteria, shoe_rental, equipment_rental, wifi, air_conditioned
- [ ] Images field accepts array of URLs (max 5 per venue)
- [ ] openTime/closeTime validated as HH:mm 24hr format
- [ ] Tenant isolation: only own venues visible/editable
- [ ] DTOs with class-validator + @ApiProperty for Swagger
- [ ] Unit tests for VenuesService (CRUD + limit check)

## Technical Details

- Existing Prisma Venue model already migrated (init migration)
- Use SubscriptionsService.getCurrentSubscription() to get plan limits
- Count existing active venues to check against maxVenues
- Tenant ID from @CurrentUser() decorator → user.tenantId
- Response envelope: { success: true, data: ... }
- Roles: POST/PATCH/DELETE restricted to TURF_OWNER; GET accessible to TURF_OWNER + TURF_MANAGER

## Branch

`feat/venue-crud-api`

## Depends On

- None

---

---

---

## Issue #21

**Title:** `feat: court CRUD API + court-sport configuration + sports seed`

**Labels:** `sprint-3`, `backend`, `venues`

**Milestone:** Sprint 3 — Venue & Court Management

**Body (copy below):**

---

## User Stories

- US-3.2: As a turf owner, I can add multiple courts to a venue so that each court has its own schedule.
- US-3.3: As a turf owner, I can assign sports to each court so that customers see what sports are available.
- US-3.4: As a turf owner, I can set different prices per sport per court so that pricing reflects actual costs.
- US-3.6: As a system, I enforce plan limits so that tenants don't exceed their subscription.

## Acceptance Criteria

### Courts

- [ ] POST /venues/:venueId/courts — create court (name, isIndoor, surfaceType, dimensions, maxPlayers, images)
- [ ] GET /venues/:venueId/courts — list courts for a venue
- [ ] GET /courts/:id — get court details (with courtSports included)
- [ ] PATCH /courts/:id — update court
- [ ] DELETE /courts/:id — soft deactivate (isActive = false)
- [ ] Subscription plan limit enforced: reject with COURT_LIMIT_REACHED (403) if maxCourts exceeded (count across ALL venues for tenant)
- [ ] surfaceType validated against predefined list: artificial_turf, natural_grass, synthetic_flooring, wooden, concrete, acrylic, mat
- [ ] Images field accepts array of URLs (max 5 per court)
- [ ] Verify venueId belongs to current tenant before creating court

### Sports (Master Data)

- [ ] GET /sports — public endpoint, list all active sports
- [ ] POST /sports — SUPER_ADMIN only, add new sport
- [ ] PATCH /sports/:id — SUPER_ADMIN only, update sport
- [ ] Seed 10 sports: Cricket, Box Cricket, Football, Futsal, Badminton, Pickleball, Tennis, Basketball, Volleyball, Table Tennis
- [ ] Update prisma/seed.ts to include sports seeding

### Court-Sport Configuration

- [ ] POST /courts/:courtId/sports — add sport to court (sportId, baseSlotMinutes, pricePerSlot, peakPricePerSlot, maxConsecutiveSlots)
- [ ] GET /courts/:courtId/sports — list sports configured for a court
- [ ] PATCH /court-sports/:id — update sport config (price, duration)
- [ ] DELETE /court-sports/:id — remove sport from court
- [ ] Unique constraint enforced: same sport can't be added twice to same court
- [ ] pricePerSlot required, peakPricePerSlot optional
- [ ] Verify courtId belongs to current tenant

### Testing

- [ ] Unit tests for CourtsService, SportsService, CourtSportsService
- [ ] Unit tests for plan limit enforcement (court count)

## Technical Details

- Court count for limit: count ALL active courts across ALL active venues for the tenant
- CourtSport uses @@unique([courtId, sportId]) constraint — handle Prisma unique violation gracefully
- Sports are not tenant-scoped (global master data)
- Prices use Decimal type (Prisma Decimal handling)
- CourtSport implemented as a separate service (court-sports.service.ts) within the courts module folder; endpoints split across courts.controller.ts (for /courts/:courtId/sports) and court-sports.controller.ts (for /court-sports/:id)
- Roles: POST/PATCH/DELETE restricted to TURF_OWNER; GET accessible to TURF_OWNER + TURF_MANAGER + TURF_STAFF

## Branch

`feat/court-sport-api`

## Depends On

- #20

---

---

---

## Issue #22

**Title:** `feat: venue & court management UI + court-sport configuration`

**Labels:** `sprint-3`, `frontend`, `venues`

**Milestone:** Sprint 3 — Venue & Court Management

**Body (copy below):**

---

## User Stories

- US-3.1: As a turf owner, I can add a venue with address and amenities so that customers know my location and facilities.
- US-3.2: As a turf owner, I can add multiple courts to a venue so that each court has its own schedule.
- US-3.3: As a turf owner, I can assign sports to each court so that customers see what sports are available.
- US-3.4: As a turf owner, I can set different prices per sport per court so that pricing reflects actual costs.
- US-3.5: As a turf owner, I can upload court images so that customers see what they're booking.

## Acceptance Criteria

### Route Structure

- [ ] /venues — venue list page (cards showing name, city, courts count, status)
- [ ] /venues/[id] — venue detail page with courts list
- [ ] /venues/[id]/courts/[courtId] — court detail page with sport configuration
- [ ] Remove old /courts route, redirect to /venues
- [ ] Update sidebar navigation: "Courts" → "Venues" with updated icon and href

### Venue Management

- [ ] Venue list with "Add Venue" button
- [ ] Empty state: helpful message + "Add your first venue" CTA when no venues exist
- [ ] Create venue form: name, address, city, state, pincode, phone, openTime, closeTime
- [ ] Amenities multi-select (13 predefined options with labels and icons)
- [ ] Venue image upload (max 5, using existing presigned URL service)
- [ ] Edit venue form (pre-filled)
- [ ] Deactivate venue (confirmation dialog)
- [ ] Show upgrade prompt when VENUE_LIMIT_REACHED error received

### Court Management (inside venue detail page)

- [ ] Court list showing name, surface type, indoor/outdoor, sports count
- [ ] Empty state: "Add your first court" CTA when no courts exist for venue
- [ ] Create court form: name, isIndoor toggle, surfaceType dropdown (7 options), dimensions, maxPlayers
- [ ] Court image upload (max 5)
- [ ] Edit court form (pre-filled)
- [ ] Deactivate court (confirmation dialog)
- [ ] Show upgrade prompt when COURT_LIMIT_REACHED error received

### Court-Sport Configuration (inside court detail page)

- [ ] "Add Sport" button → dropdown showing available sports (from GET /sports)
- [ ] Sport config form: baseSlotMinutes, pricePerSlot (₹), peakPricePerSlot (₹), maxConsecutiveSlots
- [ ] List of configured sports with edit/remove actions
- [ ] Remove sport confirmation dialog
- [ ] Empty state: "Assign a sport to this court" CTA when no sports configured

### UI Components

- [ ] Amenities selector component (checkbox grid with icons)
- [ ] Surface type dropdown component
- [ ] Image upload component (preview, delete, max limit indicator)
- [ ] Price input component (₹ prefix, decimal support)
- [ ] Time picker component (HH:mm format for open/close time)

### Testing

- [ ] Vitest: venue list rendering, form validation, limit error handling

## Technical Details

- Use existing api-client.ts for API calls
- Use existing presigned URL upload flow (POST /uploads/presigned-url → PUT to S3 → save URL)
- Use existing toast component for success/error feedback
- Use shadcn/ui components (Card, Button, Input, Select, Dialog, Badge)
- Responsive: works on mobile (320px+)
- Loading states: skeleton loaders while data fetches
- Form validation: client-side validation matching backend DTOs
- Empty state: show helpful message + CTA when no data exists

## Branch

`feat/venue-court-ui`

## Depends On

- #20, #21

---

---

---

## Issue #23

**Title:** `feat: venue & court API integration tests + E2E verification`

**Labels:** `sprint-3`, `backend`, `venues`

**Milestone:** Sprint 3 — Venue & Court Management

**Body (copy below):**

---

## User Stories

- All US-3.X stories validated end-to-end.

## Acceptance Criteria

- [ ] Integration tests: full venue lifecycle (create → list → get → update → deactivate)
- [ ] Integration tests: full court lifecycle (create → list → get → update → deactivate)
- [ ] Integration tests: court-sport lifecycle (add → list → update → remove)
- [ ] Integration test: venue limit enforcement (create up to max → next one rejected)
- [ ] Integration test: court limit enforcement across multiple venues
- [ ] Integration test: tenant isolation (tenant A cannot see tenant B's venues)
- [ ] Integration test: role-based access (CUSTOMER cannot create venues)
- [ ] Integration test: unique court-sport constraint (duplicate rejected gracefully)
- [ ] Manual E2E: login → navigate to venues → create venue → add court → assign sport → verify on venue detail page
- [ ] All existing tests still pass (pnpm test)
- [ ] Type check passes (pnpm type-check)
- [ ] Lint passes (pnpm lint)
- [ ] Create docs/4.3-venue-court-management.md (Sprint 3 implementation doc)

## Technical Details

- Use Supertest for integration tests (existing test setup in apps/api/src/test/)
- Create test fixtures for venues, courts, sports
- Use test database (docker-compose provides PostgreSQL)
- docs/4.3-venue-court-management.md should cover:
  - Amenities list (13 items with display labels)
  - Surface types (7 options with display labels)
  - Sports seed data (10 sports in order)
  - Plan limit enforcement logic
  - Image upload flow (max 5 per venue/court)
  - API endpoints implemented (request/response examples)
  - Frontend routes (navigation change from /courts to /venues)
  - New UI components created
  - Testing summary (unit + integration counts)

## Branch

`feat/venue-court-tests`

## Depends On

- #20, #21, #22

---

---

---

## Execution Order

| Order | Issue | Title                                  | Branch                   | PR  | Closes |
| ----- | ----- | -------------------------------------- | ------------------------ | --- | ------ |
| 1     | #20   | Venue CRUD API + plan limit            | `feat/venue-crud-api`    | #24 | #20    |
| 2     | #21   | Court CRUD + court-sport + sports seed | `feat/court-sport-api`   | #25 | #21    |
| 3     | #22   | Venue & court management UI            | `feat/venue-court-ui`    | #26 | #22    |
| 4     | #23   | Integration tests + E2E + docs         | `feat/venue-court-tests` | #27 | #23    |

---

## Sprint 3 Completion Checklist

- [ ] All 4 issues closed
- [ ] All 4 PRs merged to main
- [ ] pnpm test — all pass
- [ ] pnpm type-check — clean
- [ ] pnpm lint — clean
- [ ] Manual E2E verified visually
- [ ] docs/4.3-venue-court-management.md created
- [ ] Milestone closed

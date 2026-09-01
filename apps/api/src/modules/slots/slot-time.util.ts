/**
 * Pure, dependency-free helpers for slot time math.
 *
 * All times are "HH:mm" 24-hour strings (e.g., "06:00", "18:30").
 * Sprint 4 assumes same-day operating windows (closeTime > openTime); overnight
 * windows that cross midnight are a documented, deferred limitation.
 *
 * Keeping this logic pure makes it trivially unit-testable and lets the frontend
 * reuse the same generation rules.
 */

/** Matches a 24-hour "HH:mm" time string. */
export const HH_MM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface TimeRange {
  startTime: string;
  endTime: string;
}

/** Returns true if the value is a valid "HH:mm" 24-hour time string. */
export function isValidTime(value: string): boolean {
  return typeof value === 'string' && HH_MM_REGEX.test(value);
}

/** Converts "HH:mm" into minutes since midnight (e.g., "01:30" -> 90). */
export function toMinutes(time: string): number {
  if (!isValidTime(time)) {
    throw new Error(`Invalid time format: "${time}" (expected HH:mm)`);
  }
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/** Converts minutes since midnight back into "HH:mm" (e.g., 90 -> "01:30"). */
export function fromMinutes(totalMinutes: number): string {
  if (!Number.isInteger(totalMinutes) || totalMinutes < 0 || totalMinutes > 24 * 60) {
    throw new Error(`Minutes out of range: ${totalMinutes}`);
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/** Duration of a range in minutes. Assumes same-day (endTime > startTime). */
export function durationMinutes(range: TimeRange): number {
  return toMinutes(range.endTime) - toMinutes(range.startTime);
}

/**
 * Returns true if two time ranges overlap.
 * Adjacent ranges (one ends exactly when the other begins) do NOT overlap.
 */
export function rangesOverlap(a: TimeRange, b: TimeRange): boolean {
  const aStart = toMinutes(a.startTime);
  const aEnd = toMinutes(a.endTime);
  const bStart = toMinutes(b.startTime);
  const bEnd = toMinutes(b.endTime);
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Finds the first overlapping pair within a list of ranges.
 * Returns the indices of the offending pair, or null if none overlap.
 */
export function findFirstOverlap(ranges: TimeRange[]): [number, number] | null {
  const sorted = ranges
    .map((range, index) => ({ range, index }))
    .sort((x, y) => toMinutes(x.range.startTime) - toMinutes(y.range.startTime));

  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (rangesOverlap(prev.range, curr.range)) {
      return [prev.index, curr.index];
    }
  }
  return null;
}

/** True if a range sits within [openTime, closeTime] inclusive (same-day). */
export function isWithinOperatingHours(
  range: TimeRange,
  openTime: string,
  closeTime: string,
): boolean {
  const open = toMinutes(openTime);
  const close = toMinutes(closeTime);
  const start = toMinutes(range.startTime);
  const end = toMinutes(range.endTime);
  return start >= open && end <= close;
}

/**
 * True if a range's duration is a positive integer multiple of baseSlotMinutes.
 * e.g. base 60 -> 60/120/180 valid; 45 invalid. base 30 -> 30/60/90 valid.
 */
export function isAlignedToBase(range: TimeRange, baseSlotMinutes: number): boolean {
  if (!Number.isInteger(baseSlotMinutes) || baseSlotMinutes <= 0) {
    return false;
  }
  const duration = durationMinutes(range);
  return duration > 0 && duration % baseSlotMinutes === 0;
}

export interface GeneratedSlot extends TimeRange {
  isPeakHour: boolean;
}

/**
 * Generates uniform base-duration slots across [openTime, closeTime], slicing
 * the window into baseSlotMinutes chunks. A slot is marked peak if it falls
 * within any of the provided peak ranges.
 *
 * A trailing partial window smaller than baseSlotMinutes is discarded (only
 * whole base slots are produced).
 */
export function generateSlots(
  openTime: string,
  closeTime: string,
  baseSlotMinutes: number,
  peakRanges: TimeRange[] = [],
): GeneratedSlot[] {
  if (!Number.isInteger(baseSlotMinutes) || baseSlotMinutes <= 0) {
    throw new Error(`baseSlotMinutes must be a positive integer, got ${baseSlotMinutes}`);
  }

  const open = toMinutes(openTime);
  const close = toMinutes(closeTime);
  if (close <= open) {
    throw new Error(
      `closeTime (${closeTime}) must be after openTime (${openTime}); overnight windows are not supported`,
    );
  }

  const slots: GeneratedSlot[] = [];
  for (let start = open; start + baseSlotMinutes <= close; start += baseSlotMinutes) {
    const end = start + baseSlotMinutes;
    const range: TimeRange = { startTime: fromMinutes(start), endTime: fromMinutes(end) };
    const isPeakHour = peakRanges.some((peak) => rangesOverlap(range, peak));
    slots.push({ ...range, isPeakHour });
  }
  return slots;
}

/** Day-of-week names in JS `Date.getUTCDay()` order (0 = Sunday). Matches Prisma's DayOfWeek values. */
const WEEKDAY_NAMES = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
] as const;

export type WeekdayName = (typeof WEEKDAY_NAMES)[number];

/** Matches a "YYYY-MM-DD" calendar date. */
export const YYYY_MM_DD_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Resolves the weekday name for a "YYYY-MM-DD" calendar date, **timezone-agnostic**.
 *
 * The date is interpreted purely by its calendar components via `Date.UTC`, so the
 * result never shifts with the server's timezone (avoids the classic off-by-one-day bug).
 * e.g. resolveWeekday("2026-06-20") === "SATURDAY" on any host.
 */
export function resolveWeekday(date: string): WeekdayName {
  if (!YYYY_MM_DD_REGEX.test(date)) {
    throw new Error(`Invalid date format: "${date}" (expected YYYY-MM-DD)`);
  }
  const [year, month, day] = date.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));

  // Reject impossible dates that JS would silently roll over (e.g. 2026-02-30).
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
    throw new Error(`Invalid calendar date: "${date}"`);
  }

  return WEEKDAY_NAMES[d.getUTCDay()];
}

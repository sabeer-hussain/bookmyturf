import {
  durationMinutes,
  findFirstOverlap,
  fromMinutes,
  generateSlots,
  isAlignedToBase,
  isValidTime,
  isWithinOperatingHours,
  rangesOverlap,
  resolveWeekday,
  toMinutes,
} from './slot-time';

describe('slot-time util', () => {
  describe('isValidTime', () => {
    it.each(['00:00', '06:00', '18:30', '23:59'])('accepts valid time %s', (t) => {
      expect(isValidTime(t)).toBe(true);
    });

    it.each(['24:00', '6:00', '06:0', '18:60', 'abc', '', '25:00'])(
      'rejects invalid time %s',
      (t) => {
        expect(isValidTime(t)).toBe(false);
      },
    );
  });

  describe('toMinutes / fromMinutes', () => {
    it('converts HH:mm to minutes', () => {
      expect(toMinutes('00:00')).toBe(0);
      expect(toMinutes('01:30')).toBe(90);
      expect(toMinutes('23:59')).toBe(1439);
    });

    it('converts minutes to HH:mm', () => {
      expect(fromMinutes(0)).toBe('00:00');
      expect(fromMinutes(90)).toBe('01:30');
      expect(fromMinutes(1439)).toBe('23:59');
    });

    it('is a round-trip', () => {
      for (const t of ['06:00', '12:15', '18:45', '23:00']) {
        expect(fromMinutes(toMinutes(t))).toBe(t);
      }
    });

    it('throws on invalid time string', () => {
      expect(() => toMinutes('bad')).toThrow(/Invalid time format/);
    });

    it('throws on out-of-range minutes', () => {
      expect(() => fromMinutes(-1)).toThrow(/out of range/);
      expect(() => fromMinutes(2000)).toThrow(/out of range/);
    });
  });

  describe('durationMinutes', () => {
    it('computes duration', () => {
      expect(durationMinutes({ startTime: '06:00', endTime: '07:00' })).toBe(60);
      expect(durationMinutes({ startTime: '18:00', endTime: '18:30' })).toBe(30);
    });
  });

  describe('rangesOverlap', () => {
    it('detects overlap', () => {
      expect(
        rangesOverlap(
          { startTime: '06:00', endTime: '07:00' },
          { startTime: '06:30', endTime: '07:30' },
        ),
      ).toBe(true);
    });

    it('treats adjacent ranges as non-overlapping', () => {
      expect(
        rangesOverlap(
          { startTime: '06:00', endTime: '07:00' },
          { startTime: '07:00', endTime: '08:00' },
        ),
      ).toBe(false);
    });

    it('detects fully-contained overlap', () => {
      expect(
        rangesOverlap(
          { startTime: '06:00', endTime: '09:00' },
          { startTime: '07:00', endTime: '08:00' },
        ),
      ).toBe(true);
    });

    it('returns false for disjoint ranges', () => {
      expect(
        rangesOverlap(
          { startTime: '06:00', endTime: '07:00' },
          { startTime: '09:00', endTime: '10:00' },
        ),
      ).toBe(false);
    });
  });

  describe('findFirstOverlap', () => {
    it('returns null when no overlaps', () => {
      const ranges = [
        { startTime: '06:00', endTime: '07:00' },
        { startTime: '07:00', endTime: '08:00' },
        { startTime: '08:00', endTime: '09:00' },
      ];
      expect(findFirstOverlap(ranges)).toBeNull();
    });

    it('finds overlapping pair (original indices, unsorted input)', () => {
      const ranges = [
        { startTime: '08:00', endTime: '09:00' },
        { startTime: '06:00', endTime: '07:30' },
        { startTime: '07:00', endTime: '08:00' },
      ];
      // sorted: [06:00-07:30](idx1), [07:00-08:00](idx2) overlap
      expect(findFirstOverlap(ranges)).toEqual([1, 2]);
    });

    it('handles single and empty lists', () => {
      expect(findFirstOverlap([])).toBeNull();
      expect(findFirstOverlap([{ startTime: '06:00', endTime: '07:00' }])).toBeNull();
    });
  });

  describe('isWithinOperatingHours', () => {
    it('accepts a range inside hours', () => {
      expect(
        isWithinOperatingHours({ startTime: '06:00', endTime: '07:00' }, '06:00', '23:00'),
      ).toBe(true);
    });

    it('accepts range touching the boundaries', () => {
      expect(
        isWithinOperatingHours({ startTime: '06:00', endTime: '23:00' }, '06:00', '23:00'),
      ).toBe(true);
    });

    it('rejects range starting before open', () => {
      expect(
        isWithinOperatingHours({ startTime: '05:30', endTime: '07:00' }, '06:00', '23:00'),
      ).toBe(false);
    });

    it('rejects range ending after close', () => {
      expect(
        isWithinOperatingHours({ startTime: '22:30', endTime: '23:30' }, '06:00', '23:00'),
      ).toBe(false);
    });
  });

  describe('isAlignedToBase', () => {
    it('accepts exact base duration', () => {
      expect(isAlignedToBase({ startTime: '06:00', endTime: '07:00' }, 60)).toBe(true);
    });

    it('accepts integer multiples of base (tournament block)', () => {
      expect(isAlignedToBase({ startTime: '06:00', endTime: '08:00' }, 60)).toBe(true);
      expect(isAlignedToBase({ startTime: '06:00', endTime: '07:30' }, 30)).toBe(true);
    });

    it('rejects durations not a multiple of base', () => {
      expect(isAlignedToBase({ startTime: '06:00', endTime: '06:45' }, 60)).toBe(false);
      expect(isAlignedToBase({ startTime: '06:00', endTime: '06:20' }, 30)).toBe(false);
    });

    it('rejects zero-length and invalid base', () => {
      expect(isAlignedToBase({ startTime: '06:00', endTime: '06:00' }, 60)).toBe(false);
      expect(isAlignedToBase({ startTime: '06:00', endTime: '07:00' }, 0)).toBe(false);
    });
  });

  describe('generateSlots', () => {
    it('slices window into base-duration slots', () => {
      const slots = generateSlots('06:00', '09:00', 60);
      expect(slots).toEqual([
        { startTime: '06:00', endTime: '07:00', isPeakHour: false },
        { startTime: '07:00', endTime: '08:00', isPeakHour: false },
        { startTime: '08:00', endTime: '09:00', isPeakHour: false },
      ]);
    });

    it('marks peak slots that fall within peak ranges', () => {
      const slots = generateSlots('17:00', '20:00', 60, [{ startTime: '18:00', endTime: '20:00' }]);
      expect(slots.map((s) => s.isPeakHour)).toEqual([false, true, true]);
    });

    it('discards trailing partial window', () => {
      const slots = generateSlots('06:00', '07:30', 60);
      expect(slots).toEqual([{ startTime: '06:00', endTime: '07:00', isPeakHour: false }]);
    });

    it('supports 30-minute base slots', () => {
      const slots = generateSlots('06:00', '07:30', 30);
      expect(slots).toHaveLength(3);
      expect(slots[2]).toEqual({ startTime: '07:00', endTime: '07:30', isPeakHour: false });
    });

    it('throws when closeTime <= openTime (overnight unsupported)', () => {
      expect(() => generateSlots('18:00', '02:00', 60)).toThrow(/overnight/);
      expect(() => generateSlots('06:00', '06:00', 60)).toThrow(/overnight/);
    });

    it('throws on invalid baseSlotMinutes', () => {
      expect(() => generateSlots('06:00', '09:00', 0)).toThrow(/positive integer/);
    });
  });

  describe('resolveWeekday', () => {
    it.each([
      ['2026-06-20', 'SATURDAY'],
      ['2026-06-21', 'SUNDAY'],
      ['2026-06-22', 'MONDAY'],
      ['2026-09-01', 'TUESDAY'],
      ['2000-01-01', 'SATURDAY'],
      ['2024-02-29', 'THURSDAY'], // leap day
    ])('resolves %s to %s', (date, expected) => {
      expect(resolveWeekday(date)).toBe(expected);
    });

    it('is timezone-agnostic (same result regardless of process TZ)', () => {
      const original = process.env.TZ;
      try {
        process.env.TZ = 'America/Los_Angeles'; // UTC-7/8
        expect(resolveWeekday('2026-06-20')).toBe('SATURDAY');
        process.env.TZ = 'Pacific/Kiritimati'; // UTC+14
        expect(resolveWeekday('2026-06-20')).toBe('SATURDAY');
      } finally {
        process.env.TZ = original;
      }
    });

    it('rejects malformed date strings', () => {
      expect(() => resolveWeekday('2026-6-20')).toThrow(/expected YYYY-MM-DD/);
      expect(() => resolveWeekday('20-06-2026')).toThrow(/expected YYYY-MM-DD/);
      expect(() => resolveWeekday('not-a-date')).toThrow(/expected YYYY-MM-DD/);
    });

    it('rejects impossible calendar dates', () => {
      expect(() => resolveWeekday('2026-02-30')).toThrow(/Invalid calendar date/);
      expect(() => resolveWeekday('2026-13-01')).toThrow(/Invalid calendar date/);
    });
  });
});

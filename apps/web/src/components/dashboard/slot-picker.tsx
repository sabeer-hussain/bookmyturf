'use client';

import { useMemo } from 'react';
import { generateSlots } from '@bookmyturf/shared';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Zap, Trash2, Plus } from 'lucide-react';

export const WEEKDAYS = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
] as const;

export type Weekday = (typeof WEEKDAYS)[number];

const DAY_LABEL: Record<Weekday, string> = {
  MONDAY: 'Mon',
  TUESDAY: 'Tue',
  WEDNESDAY: 'Wed',
  THURSDAY: 'Thu',
  FRIDAY: 'Fri',
  SATURDAY: 'Sat',
  SUNDAY: 'Sun',
};

/** A slot config as returned by the API (existing DB row). */
export interface SlotConfig {
  id: string;
  dayOfWeek: Weekday;
  startTime: string;
  endTime: string;
  isPeakHour: boolean;
  isActive: boolean;
}

interface SlotPickerProps {
  openTime: string;
  closeTime: string;
  baseSlotMinutes: number;
  /** Existing active slot configs from the API, keyed lookup done internally. */
  configs: SlotConfig[];
  /** Enable a currently-inactive grid slot (create). */
  onEnable: (day: Weekday, startTime: string, endTime: string) => void;
  /** Toggle the peak flag on an existing slot. */
  onTogglePeak: (config: SlotConfig) => void;
  /** Remove an existing slot. */
  onRemove: (config: SlotConfig) => void;
  /** Whether a peak price is configured (drives the peak-price hint). */
  hasPeakPrice: boolean;
  disabled?: boolean;
}

/**
 * Weekly grid-toggle slot picker.
 *
 * The grid skeleton is generated from venue hours ÷ baseSlotMinutes (shared
 * `generateSlots`), so every cell is base-aligned and within hours by construction.
 * Existing configs are matched by (day, startTime); the owner toggles cells
 * active/off and peak/off-peak.
 */
export function SlotPicker({
  openTime,
  closeTime,
  baseSlotMinutes,
  configs,
  onEnable,
  onTogglePeak,
  onRemove,
  hasPeakPrice,
  disabled,
}: SlotPickerProps) {
  // Base grid skeleton (same set of time ranges for every day).
  const gridSlots = useMemo(() => {
    try {
      return generateSlots(openTime, closeTime, baseSlotMinutes);
    } catch {
      return [];
    }
  }, [openTime, closeTime, baseSlotMinutes]);

  // Fast lookup: `${day}|${startTime}` -> existing config.
  const configMap = useMemo(() => {
    const map = new Map<string, SlotConfig>();
    for (const c of configs) {
      if (c.isActive) map.set(`${c.dayOfWeek}|${c.startTime}`, c);
    }
    return map;
  }, [configs]);

  if (gridSlots.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Unable to generate a slot grid for venue hours {openTime}–{closeTime} with a{' '}
        {baseSlotMinutes}-minute base. Check the venue’s operating hours.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {hasPeakPrice ? null : (
        <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          Tip: set a <span className="font-medium">peak price</span> on this sport to charge more
          for peak slots. Until then, peak-marked slots use the base price.
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-separate border-spacing-1 text-sm">
          <thead>
            <tr>
              <th className="w-20 p-1 text-left font-medium text-muted-foreground">Time</th>
              {WEEKDAYS.map((day) => (
                <th key={day} className="p-1 text-center font-medium text-muted-foreground">
                  {DAY_LABEL[day]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {gridSlots.map((slot) => (
              <tr key={slot.startTime}>
                <td className="whitespace-nowrap p-1 text-xs text-muted-foreground">
                  {slot.startTime}
                </td>
                {WEEKDAYS.map((day) => {
                  const existing = configMap.get(`${day}|${slot.startTime}`);
                  const active = !!existing;
                  return (
                    <td key={day} className="p-0.5">
                      <div
                        className={cn(
                          'group relative flex h-9 items-center justify-center rounded-md border text-xs transition-colors',
                          active
                            ? existing!.isPeakHour
                              ? 'border-amber-400 bg-amber-50 text-amber-700'
                              : 'border-primary/40 bg-primary/5 text-primary'
                            : 'border-dashed border-input text-muted-foreground/50 hover:border-primary/50 hover:bg-accent',
                          disabled && 'pointer-events-none opacity-60',
                        )}
                      >
                        {active ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onTogglePeak(existing!)}
                              aria-label={existing!.isPeakHour ? 'Unmark peak' : 'Mark peak'}
                              title={existing!.isPeakHour ? 'Peak (click to unmark)' : 'Mark peak'}
                              className={cn(
                                'rounded p-0.5 transition-colors',
                                existing!.isPeakHour
                                  ? 'text-amber-600'
                                  : 'text-muted-foreground hover:text-amber-600',
                              )}
                            >
                              <Zap className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onRemove(existing!)}
                              aria-label="Remove slot"
                              title="Remove slot"
                              className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onEnable(day, slot.startTime, slot.endTime)}
                            aria-label={`Add ${DAY_LABEL[day]} ${slot.startTime} slot`}
                            title={`Add ${slot.startTime}–${slot.endTime}`}
                            className="flex h-full w-full items-center justify-center"
                          >
                            <Plus className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100" />
                          </button>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded border border-primary/40 bg-primary/5" />
          Active (off-peak)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded border border-amber-400 bg-amber-50" />
          <Zap className="h-3 w-3 text-amber-600" /> Peak
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded border border-dashed border-input" />
          Available to add
        </span>
      </div>

      <Badge variant="secondary" className="text-xs">
        {configMap.size} slot{configMap.size === 1 ? '' : 's'} configured
      </Badge>
    </div>
  );
}

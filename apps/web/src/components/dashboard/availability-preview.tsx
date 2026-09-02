'use client';

import { useMemo, useState } from 'react';
import { resolveWeekday } from '@bookmyturf/shared';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, IndianRupee, Zap } from 'lucide-react';
import type { SlotConfig, Weekday } from './slot-picker';

interface AvailabilityPreviewProps {
  configs: SlotConfig[];
  basePrice: number;
  peakPrice: number | null;
}

/**
 * Minimal "customer view" preview: pick a date -> resolve its weekday -> show that
 * weekday's active slots read-only with computed prices, all marked Available.
 *
 * Sprint 4 reflects configuration only (no bookings yet); it becomes true
 * availability in Sprint 5 when bookings + the public endpoint exist.
 */
export function AvailabilityPreview({ configs, basePrice, peakPrice }: AvailabilityPreviewProps) {
  const [date, setDate] = useState('');

  const weekday = useMemo<Weekday | null>(() => {
    if (!date) return null;
    try {
      return resolveWeekday(date) as Weekday;
    } catch {
      return null;
    }
  }, [date]);

  const slots = useMemo(() => {
    if (!weekday) return [];
    return configs
      .filter((c) => c.isActive && c.dayOfWeek === weekday)
      .map((c) => ({
        ...c,
        price: c.isPeakHour && peakPrice != null ? peakPrice : basePrice,
      }))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [configs, weekday, basePrice, peakPrice]);

  return (
    <div className="space-y-4">
      <div className="max-w-xs">
        <Label htmlFor="preview-date">Preview a date (what customers see)</Label>
        <Input
          id="preview-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      {!date && (
        <p className="text-sm text-muted-foreground">
          Pick a date to preview available slots and prices.
        </p>
      )}

      {date && weekday && (
        <div>
          <p className="mb-2 text-sm text-muted-foreground">
            <CalendarDays className="mr-1 inline h-3.5 w-3.5" />
            {date} · {weekday.charAt(0) + weekday.slice(1).toLowerCase()}
          </p>
          {slots.length === 0 ? (
            <p className="text-sm text-muted-foreground">No slots available on this day.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {slots.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-col gap-1 rounded-md border border-primary/30 bg-primary/5 p-2 text-sm"
                >
                  <span className="font-medium">
                    {s.startTime}–{s.endTime}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <IndianRupee className="h-3 w-3" />
                    {s.price}
                    {s.isPeakHour && (
                      <Zap className="ml-0.5 h-3 w-3 text-amber-600" aria-label="Peak" />
                    )}
                  </span>
                  <Badge variant="secondary" className="w-fit text-[10px]">
                    Available
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

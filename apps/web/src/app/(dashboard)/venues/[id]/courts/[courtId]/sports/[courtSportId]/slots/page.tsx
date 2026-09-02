'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { generateSlots } from '@bookmyturf/shared';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ListSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import {
  SlotPicker,
  type SlotConfig,
  type Weekday,
  WEEKDAYS,
} from '@/components/dashboard/slot-picker';
import { AvailabilityPreview } from '@/components/dashboard/availability-preview';
import { ArrowLeft, ChevronRight, CalendarClock, Loader2, Wand2 } from 'lucide-react';

interface CourtSport {
  id: string;
  baseSlotMinutes: number;
  pricePerSlot: string;
  peakPricePerSlot: string | null;
  sport: { id: string; name: string };
}

export default function SlotConfigPage() {
  const {
    id: venueId,
    courtId,
    courtSportId,
  } = useParams<{
    id: string;
    courtId: string;
    courtSportId: string;
  }>();
  const { toast } = useToast();

  const [venue, setVenue] = useState<{ name: string; openTime: string; closeTime: string } | null>(
    null,
  );
  const [court, setCourt] = useState<{ name: string } | null>(null);
  const [courtSport, setCourtSport] = useState<CourtSport | null>(null);
  const [configs, setConfigs] = useState<SlotConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<SlotConfig | null>(null);
  const [removing, setRemoving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [venueRes, courtRes, slotsRes] = await Promise.all([
        api.get(`/venues/${venueId}`),
        api.get(`/courts/${courtId}`),
        api.get(`/court-sports/${courtSportId}/slots`),
      ]);
      const venueData = venueRes.data.data;
      setVenue({
        name: venueData.name,
        openTime: venueData.openTime,
        closeTime: venueData.closeTime,
      });
      const courtData = courtRes.data.data;
      setCourt({ name: courtData.name });
      const cs = (courtData.courtSports || []).find((c: CourtSport) => c.id === courtSportId);
      setCourtSport(cs || null);
      setConfigs(slotsRes.data.data);
    } catch {
      toast('Failed to load slot configuration', 'error');
    } finally {
      setLoading(false);
    }
  }, [venueId, courtId, courtSportId, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const hasPeakPrice = !!courtSport?.peakPricePerSlot;
  const basePrice = courtSport ? Number(courtSport.pricePerSlot) : 0;
  const peakPrice = courtSport?.peakPricePerSlot ? Number(courtSport.peakPricePerSlot) : null;

  // Enable a single grid slot (create).
  const handleEnable = async (day: Weekday, startTime: string, endTime: string) => {
    try {
      const res = await api.post(`/court-sports/${courtSportId}/slots`, {
        dayOfWeek: day,
        startTime,
        endTime,
        isPeakHour: false,
      });
      setConfigs((prev) => [...prev, res.data.data]);
    } catch (err: any) {
      toast(err.response?.data?.message || 'Failed to add slot', 'error');
    }
  };

  // Toggle peak on an existing slot.
  const handleTogglePeak = async (config: SlotConfig) => {
    const next = !config.isPeakHour;
    // optimistic
    setConfigs((prev) => prev.map((c) => (c.id === config.id ? { ...c, isPeakHour: next } : c)));
    try {
      await api.patch(`/slot-configs/${config.id}`, { isPeakHour: next });
    } catch (err: any) {
      // revert
      setConfigs((prev) =>
        prev.map((c) => (c.id === config.id ? { ...c, isPeakHour: config.isPeakHour } : c)),
      );
      toast(err.response?.data?.message || 'Failed to update slot', 'error');
    }
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      await api.delete(`/slot-configs/${removeTarget.id}`);
      setConfigs((prev) => prev.filter((c) => c.id !== removeTarget.id));
      toast('Slot removed', 'success');
      setRemoveTarget(null);
    } catch (err: any) {
      toast(err.response?.data?.message || 'Failed to remove slot', 'error');
    } finally {
      setRemoving(false);
    }
  };

  // Auto-generate: create only the base slots that don't already exist (idempotent), off-peak.
  const missingSlots = useMemo(() => {
    if (!venue || !courtSport) return [];
    let base;
    try {
      base = generateSlots(venue.openTime, venue.closeTime, courtSport.baseSlotMinutes);
    } catch {
      return [];
    }
    const existing = new Set(
      configs.filter((c) => c.isActive).map((c) => `${c.dayOfWeek}|${c.startTime}`),
    );
    const out: { dayOfWeek: Weekday; startTime: string; endTime: string; isPeakHour: boolean }[] =
      [];
    for (const day of WEEKDAYS) {
      for (const s of base) {
        if (!existing.has(`${day}|${s.startTime}`)) {
          out.push({
            dayOfWeek: day,
            startTime: s.startTime,
            endTime: s.endTime,
            isPeakHour: false,
          });
        }
      }
    }
    return out;
  }, [venue, courtSport, configs]);

  const handleAutoGenerate = () => {
    if (missingSlots.length === 0) {
      toast('All slots already exist for the week', 'info');
      return;
    }
    setShowGenerateConfirm(true);
  };

  const confirmAutoGenerate = async () => {
    setGenerating(true);
    try {
      const res = await api.post(`/court-sports/${courtSportId}/slots/bulk`, {
        slots: missingSlots,
      });
      setConfigs((prev) => [...prev, ...res.data.data]);
      toast(`Generated ${res.data.data.length} slots`, 'success');
    } catch (err: any) {
      toast(err.response?.data?.message || 'Failed to auto-generate slots', 'error');
    } finally {
      setGenerating(false);
      setShowGenerateConfirm(false);
    }
  };

  if (loading) {
    return <ListSkeleton count={2} />;
  }

  if (!venue || !court || !courtSport) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Court sport configuration not found</p>
        <Link
          href={`/venues/${venueId}/courts/${courtId}`}
          className="mt-2 inline-block text-sm text-primary hover:underline"
        >
          ← Back to Court
        </Link>
      </div>
    );
  }

  const hasConfigs = configs.some((c) => c.isActive);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Link href="/venues" className="transition-colors hover:text-foreground">
          Venues
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href={`/venues/${venueId}`} className="transition-colors hover:text-foreground">
          {venue.name}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link
          href={`/venues/${venueId}/courts/${courtId}`}
          className="transition-colors hover:text-foreground"
        >
          {court.name}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-foreground">{courtSport.sport.name} Slots</span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <CalendarClock className="h-6 w-6 text-primary" />
            {courtSport.sport.name} — Slot Configuration
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {venue.openTime}–{venue.closeTime} · {courtSport.baseSlotMinutes}-min slots · ₹
            {basePrice}
            {peakPrice != null && ` (peak ₹${peakPrice})`}
          </p>
        </div>
        <Button onClick={handleAutoGenerate} disabled={generating}>
          {generating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Wand2 className="mr-2 h-4 w-4" />
          )}
          Auto-generate week{missingSlots.length > 0 ? ` (${missingSlots.length})` : ''}
        </Button>
      </div>

      {/* Weekly Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Weekly Slots</CardTitle>
        </CardHeader>
        <CardContent>
          {!hasConfigs && (
            <EmptyState
              icon={CalendarClock}
              title="No slots configured"
              description="Auto-generate a full week from the venue hours, or click a cell to add individual slots."
              actionLabel="Auto-generate week"
              onAction={handleAutoGenerate}
              className="mb-4"
            />
          )}
          <SlotPicker
            openTime={venue.openTime}
            closeTime={venue.closeTime}
            baseSlotMinutes={courtSport.baseSlotMinutes}
            configs={configs}
            onEnable={handleEnable}
            onTogglePeak={handleTogglePeak}
            onRemove={(c) => setRemoveTarget(c)}
            hasPeakPrice={hasPeakPrice}
          />
        </CardContent>
      </Card>

      {/* Availability Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Availability Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <AvailabilityPreview configs={configs} basePrice={basePrice} peakPrice={peakPrice} />
        </CardContent>
      </Card>

      {/* Back link */}
      <Link
        href={`/venues/${venueId}/courts/${courtId}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to {court.name}
      </Link>

      <ConfirmDialog
        open={showGenerateConfirm}
        onClose={() => setShowGenerateConfirm(false)}
        onConfirm={confirmAutoGenerate}
        title="Auto-generate week"
        description={`This will create ${missingSlots.length} slot${missingSlots.length === 1 ? '' : 's'} across the week (${venue.openTime}–${venue.closeTime}, ${courtSport.baseSlotMinutes}-min each). Existing slots are kept. Continue?`}
        confirmLabel="Generate"
        loading={generating}
      />

      <ConfirmDialog
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleRemove}
        title="Remove Slot"
        description={`Remove the ${removeTarget?.startTime}–${removeTarget?.endTime} slot on ${removeTarget?.dayOfWeek}? This cannot be undone.`}
        confirmLabel="Remove"
        loading={removing}
      />
    </div>
  );
}

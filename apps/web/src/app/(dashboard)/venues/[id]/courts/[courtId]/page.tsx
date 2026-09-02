'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ListSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { CourtSportFormModal } from '@/components/dashboard/court-sport-form-modal';
import { SURFACE_TYPES } from '@/lib/constants';
import {
  ArrowLeft,
  ChevronRight,
  Dumbbell,
  Plus,
  Pencil,
  Trash2,
  Clock,
  IndianRupee,
  Layers,
  CalendarClock,
} from 'lucide-react';

interface CourtSport {
  id: string;
  sportId: string;
  baseSlotMinutes: number;
  pricePerSlot: string;
  peakPricePerSlot: string | null;
  maxConsecutiveSlots: number;
  isActive: boolean;
  sport: { id: string; name: string; icon: string };
}

interface Court {
  id: string;
  name: string;
  description: string | null;
  isIndoor: boolean;
  surfaceType: string | null;
  dimensions: string | null;
  maxPlayers: number | null;
  courtSports: CourtSport[];
}

interface Venue {
  id: string;
  name: string;
}

export default function CourtDetailPage() {
  const { id: venueId, courtId } = useParams<{ id: string; courtId: string }>();
  const [court, setCourt] = useState<Court | null>(null);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editCourtSport, setEditCourtSport] = useState<CourtSport | null>(null);
  const [deleteCourtSport, setDeleteCourtSport] = useState<CourtSport | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      const [courtRes, venueRes] = await Promise.all([
        api.get(`/courts/${courtId}`),
        api.get(`/venues/${venueId}`),
      ]);
      setCourt(courtRes.data.data);
      setVenue(venueRes.data.data);
    } catch {
      toast('Failed to load court details', 'error');
    } finally {
      setLoading(false);
    }
  }, [courtId, venueId, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAdd = () => {
    setEditCourtSport(null);
    setShowForm(true);
  };

  const handleEdit = (cs: CourtSport) => {
    setEditCourtSport(cs);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditCourtSport(null);
    fetchData();
  };

  const handleRemove = async () => {
    if (!deleteCourtSport) return;
    setDeleting(true);
    try {
      await api.delete(`/court-sports/${deleteCourtSport.id}`);
      toast('Sport removed from court', 'success');
      setDeleteCourtSport(null);
      fetchData();
    } catch (err: any) {
      toast(err.response?.data?.message || 'Failed to remove sport', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const getSurfaceLabel = (value: string | null) => {
    if (!value) return null;
    return SURFACE_TYPES.find((s) => s.value === value)?.label || value;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <ListSkeleton count={2} />
      </div>
    );
  }

  if (!court || !venue) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Court not found</p>
        <Link
          href={`/venues/${venueId}`}
          className="text-primary hover:underline text-sm mt-2 inline-block"
        >
          ← Back to Venue
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/venues" className="hover:text-foreground transition-colors">
          Venues
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href={`/venues/${venueId}`} className="hover:text-foreground transition-colors">
          {venue.name}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">{court.name}</span>
      </div>

      {/* Court Header */}
      <div>
        <h1 className="text-2xl font-bold">{court.name}</h1>
        {court.description && (
          <p className="text-sm text-muted-foreground mt-1">{court.description}</p>
        )}
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge variant="secondary">{court.isIndoor ? 'Indoor' : 'Outdoor'}</Badge>
          {court.surfaceType && (
            <Badge variant="secondary">{getSurfaceLabel(court.surfaceType)}</Badge>
          )}
          {court.dimensions && <Badge variant="secondary">{court.dimensions}</Badge>}
          {court.maxPlayers && <Badge variant="secondary">Max {court.maxPlayers} players</Badge>}
        </div>
      </div>

      {/* Sports Configuration Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Sports Configuration</h2>
          {court.courtSports.length > 0 && (
            <Button onClick={handleAdd} size="sm">
              <Plus className="mr-2 h-3.5 w-3.5" />
              Add Sport
            </Button>
          )}
        </div>

        {/* Empty State */}
        {court.courtSports.length === 0 && (
          <EmptyState
            icon={Dumbbell}
            title="No sports configured"
            description="Assign sports to this court with pricing and slot duration"
            actionLabel="Assign a Sport"
            onAction={handleAdd}
          />
        )}

        {/* Court Sports List */}
        {court.courtSports.length > 0 && (
          <div className="grid gap-3">
            {court.courtSports.map((cs) => (
              <Card key={cs.id} className="group">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Dumbbell className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">{cs.sport.name}</h4>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <IndianRupee className="h-3 w-3" />₹{cs.pricePerSlot}/slot
                        </span>
                        {cs.peakPricePerSlot && (
                          <span className="flex items-center gap-1">
                            ₹{cs.peakPricePerSlot} peak
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {cs.baseSlotMinutes} min
                        </span>
                        <span className="flex items-center gap-1">
                          <Layers className="h-3 w-3" />
                          Max {cs.maxConsecutiveSlots} slots
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link
                      href={`/venues/${venueId}/courts/${courtId}/sports/${cs.id}/slots`}
                      className="rounded-md px-2 py-1.5 text-xs font-medium text-primary hover:bg-primary/10"
                      aria-label="Configure slots"
                    >
                      <span className="flex items-center gap-1">
                        <CalendarClock className="h-3.5 w-3.5" />
                        Configure Slots
                      </span>
                    </Link>
                    <button
                      onClick={() => handleEdit(cs)}
                      className="rounded-md p-1.5 hover:bg-accent"
                      aria-label="Edit sport config"
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => setDeleteCourtSport(cs)}
                      className="rounded-md p-1.5 hover:bg-destructive/10"
                      aria-label="Remove sport"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Back link */}
      <Link
        href={`/venues/${venueId}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to {venue.name}
      </Link>

      {/* Court Sport Form Modal */}
      <CourtSportFormModal
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setEditCourtSport(null);
        }}
        onSuccess={handleFormSuccess}
        courtId={courtId}
        courtSport={editCourtSport}
        existingSportIds={court.courtSports.map((cs) => cs.sportId)}
      />

      {/* Remove Confirmation */}
      <ConfirmDialog
        open={!!deleteCourtSport}
        onClose={() => setDeleteCourtSport(null)}
        onConfirm={handleRemove}
        title="Remove Sport"
        description={`Are you sure you want to remove "${deleteCourtSport?.sport.name}" from this court? This action cannot be undone.`}
        confirmLabel="Remove"
        loading={deleting}
      />
    </div>
  );
}

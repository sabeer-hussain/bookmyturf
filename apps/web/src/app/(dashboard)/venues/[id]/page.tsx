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
import { CourtFormModal } from '@/components/dashboard/court-form-modal';
import { ArrowLeft, ChevronRight, LayoutGrid, Plus, Pencil, Trash2 } from 'lucide-react';
import { SURFACE_TYPES } from '@/lib/constants';

interface Court {
  id: string;
  name: string;
  description: string | null;
  isIndoor: boolean;
  surfaceType: string | null;
  dimensions: string | null;
  maxPlayers: number | null;
  images: string[];
  isActive: boolean;
  _count: { courtSports: number };
}

interface Venue {
  id: string;
  name: string;
  city: string;
  state: string;
}

export default function VenueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editCourt, setEditCourt] = useState<Court | null>(null);
  const [deleteCourt, setDeleteCourt] = useState<Court | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      const [venueRes, courtsRes] = await Promise.all([
        api.get(`/venues/${id}`),
        api.get(`/venues/${id}/courts`),
      ]);
      setVenue(venueRes.data.data);
      setCourts(courtsRes.data.data);
    } catch {
      toast('Failed to load venue details', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = () => {
    setEditCourt(null);
    setShowForm(true);
  };

  const handleEdit = (court: Court) => {
    setEditCourt(court);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditCourt(null);
    fetchData();
  };

  const handleDeactivate = async () => {
    if (!deleteCourt) return;
    setDeleting(true);
    try {
      await api.delete(`/courts/${deleteCourt.id}`);
      toast('Court deactivated successfully', 'success');
      setDeleteCourt(null);
      fetchData();
    } catch (err: any) {
      toast(err.response?.data?.message || 'Failed to deactivate court', 'error');
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
        <ListSkeleton count={3} />
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Venue not found</p>
        <Link href="/venues" className="text-primary hover:underline text-sm mt-2 inline-block">
          ← Back to Venues
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
        <span className="text-foreground font-medium">{venue.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{venue.name}</h1>
          <p className="text-sm text-muted-foreground">
            {venue.city}, {venue.state}
          </p>
        </div>
        {courts.length > 0 && (
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Court
          </Button>
        )}
      </div>

      {/* Empty State */}
      {courts.length === 0 && (
        <EmptyState
          icon={LayoutGrid}
          title="No courts yet"
          description="Add your first court to start configuring sports and pricing"
          actionLabel="Add Your First Court"
          onAction={handleCreate}
        />
      )}

      {/* Courts List */}
      {courts.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {courts.map((court) => (
            <Card
              key={court.id}
              className="group relative overflow-hidden transition-shadow hover:shadow-md"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <Link href={`/venues/${id}/courts/${court.id}`} className="flex-1">
                    <h3 className="font-semibold hover:text-primary transition-colors">
                      {court.name}
                    </h3>
                  </Link>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(court)}
                      className="rounded-md p-1.5 hover:bg-accent"
                      aria-label="Edit court"
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => setDeleteCourt(court)}
                      className="rounded-md p-1.5 hover:bg-destructive/10"
                      aria-label="Deactivate court"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="text-xs">
                    {court.isIndoor ? 'Indoor' : 'Outdoor'}
                  </Badge>
                  {court.surfaceType && (
                    <Badge variant="secondary" className="text-xs">
                      {getSurfaceLabel(court.surfaceType)}
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-xs">
                    {court._count.courtSports} sport{court._count.courtSports !== 1 ? 's' : ''}
                  </Badge>
                </div>

                {court.dimensions && (
                  <p className="mt-2 text-xs text-muted-foreground">{court.dimensions}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Back link */}
      <Link
        href="/venues"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Venues
      </Link>

      {/* Court Form Modal */}
      <CourtFormModal
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setEditCourt(null);
        }}
        onSuccess={handleFormSuccess}
        venueId={id}
        court={editCourt}
      />

      {/* Deactivate Confirmation */}
      <ConfirmDialog
        open={!!deleteCourt}
        onClose={() => setDeleteCourt(null)}
        onConfirm={handleDeactivate}
        title="Deactivate Court"
        description={`Are you sure you want to deactivate "${deleteCourt?.name}"? This court and its sport configurations will no longer be visible.`}
        confirmLabel="Deactivate"
        loading={deleting}
      />
    </div>
  );
}

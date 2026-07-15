'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ListSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { VenueFormModal } from '@/components/dashboard/venue-form-modal';
import { Building2, Clock, MapPin, Plus, LayoutGrid, Pencil, Trash2 } from 'lucide-react';

interface Venue {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  openTime: string;
  closeTime: string;
  amenities: string[];
  images: string[];
  isActive: boolean;
  _count: { courts: number };
}

export default function VenuesPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editVenue, setEditVenue] = useState<Venue | null>(null);
  const [deleteVenue, setDeleteVenue] = useState<Venue | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const fetchVenues = useCallback(async () => {
    try {
      const { data } = await api.get('/venues');
      setVenues(data.data);
    } catch {
      toast('Failed to load venues', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchVenues();
  }, [fetchVenues]);

  const handleCreate = () => {
    setEditVenue(null);
    setShowForm(true);
  };

  const handleEdit = (venue: Venue) => {
    setEditVenue(venue);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditVenue(null);
    fetchVenues();
  };

  const handleDeactivate = async () => {
    if (!deleteVenue) return;
    setDeleting(true);
    try {
      await api.delete(`/venues/${deleteVenue.id}`);
      toast('Venue deactivated successfully', 'success');
      setDeleteVenue(null);
      fetchVenues();
    } catch (err: any) {
      toast(err.response?.data?.message || 'Failed to deactivate venue', 'error');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Venues</h1>
        </div>
        <ListSkeleton count={3} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Venues</h1>
          <p className="text-sm text-muted-foreground">Manage your sports venues and facilities</p>
        </div>
        {venues.length > 0 && (
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Venue
          </Button>
        )}
      </div>

      {/* Empty State */}
      {venues.length === 0 && (
        <EmptyState
          icon={Building2}
          title="No venues yet"
          description="Add your first venue to start managing courts and bookings"
          actionLabel="Add Your First Venue"
          onAction={handleCreate}
        />
      )}

      {/* Venue Cards */}
      {venues.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {venues.map((venue) => (
            <Card
              key={venue.id}
              className="group relative overflow-hidden transition-shadow hover:shadow-md"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <Link href={`/venues/${venue.id}`} className="flex-1">
                    <h3 className="font-semibold text-lg leading-tight hover:text-primary transition-colors">
                      {venue.name}
                    </h3>
                  </Link>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(venue)}
                      className="rounded-md p-1.5 hover:bg-accent"
                      aria-label="Edit venue"
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => setDeleteVenue(venue)}
                      className="rounded-md p-1.5 hover:bg-destructive/10"
                      aria-label="Deactivate venue"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>
                      {venue.city}, {venue.state}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>
                      {venue.openTime} — {venue.closeTime}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <LayoutGrid className="h-3.5 w-3.5" />
                    <span>
                      {venue._count.courts} court{venue._count.courts !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {venue.amenities.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {venue.amenities.slice(0, 3).map((a) => (
                      <Badge key={a} variant="secondary" className="text-xs">
                        {a.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                    {venue.amenities.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{venue.amenities.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Venue Form Modal */}
      <VenueFormModal
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setEditVenue(null);
        }}
        onSuccess={handleFormSuccess}
        venue={editVenue}
      />

      {/* Deactivate Confirmation */}
      <ConfirmDialog
        open={!!deleteVenue}
        onClose={() => setDeleteVenue(null)}
        onConfirm={handleDeactivate}
        title="Deactivate Venue"
        description={`Are you sure you want to deactivate "${deleteVenue?.name}"? This venue and its courts will no longer be visible.`}
        confirmLabel="Deactivate"
        loading={deleting}
      />
    </div>
  );
}

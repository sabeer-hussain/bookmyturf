'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SurfaceTypeSelect } from '@/components/shared/surface-type-select';
import { ImageUpload } from '@/components/shared/image-upload';
import { Loader2 } from 'lucide-react';

interface Court {
  id: string;
  name: string;
  description: string | null;
  isIndoor: boolean;
  surfaceType: string | null;
  dimensions: string | null;
  maxPlayers: number | null;
  images: string[];
}

interface CourtFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  venueId: string;
  court?: Court | null;
}

export function CourtFormModal({ open, onClose, onSuccess, venueId, court }: CourtFormModalProps) {
  const isEdit = !!court;
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: court?.name || '',
    description: court?.description || '',
    isIndoor: court?.isIndoor || false,
    surfaceType: court?.surfaceType || '',
    dimensions: court?.dimensions || '',
    maxPlayers: court?.maxPlayers?.toString() || '',
    images: court?.images || [],
  });

  // Sync form when modal opens or court prop changes
  useEffect(() => {
    if (open) {
      setForm({
        name: court?.name || '',
        description: court?.description || '',
        isIndoor: court?.isIndoor || false,
        surfaceType: court?.surfaceType || '',
        dimensions: court?.dimensions || '',
        maxPlayers: court?.maxPlayers?.toString() || '',
        images: court?.images || [],
      });
    }
  }, [open, court]);

  const handleClose = () => {
    setForm({
      name: court?.name || '',
      description: court?.description || '',
      isIndoor: court?.isIndoor || false,
      surfaceType: court?.surfaceType || '',
      dimensions: court?.dimensions || '',
      maxPlayers: court?.maxPlayers?.toString() || '',
      images: court?.images || [],
    });
    onClose();
  };

  const updateField = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        name: form.name,
        description: form.description || undefined,
        isIndoor: form.isIndoor,
        surfaceType: form.surfaceType || undefined,
        dimensions: form.dimensions || undefined,
        maxPlayers: form.maxPlayers ? parseInt(form.maxPlayers) : undefined,
        images: form.images.length > 0 ? form.images : undefined,
      };

      if (isEdit) {
        await api.patch(`/courts/${court.id}`, payload);
        toast('Court updated successfully', 'success');
      } else {
        await api.post(`/venues/${venueId}/courts`, payload);
        toast('Court created successfully', 'success');
      }
      onSuccess();
    } catch (err: any) {
      const message = err.response?.data?.message;
      if (message?.includes('COURT_LIMIT_REACHED') || message?.includes('maximum')) {
        toast('Court limit reached. Please upgrade your plan.', 'error');
      } else if (message?.includes('SUBSCRIPTION_INACTIVE')) {
        toast('Your subscription is inactive. Please renew.', 'error');
      } else {
        toast(message || `Failed to ${isEdit ? 'update' : 'create'} court`, 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={isEdit ? 'Edit Court' : 'Add New Court'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <Label htmlFor="court-name">Court Name *</Label>
          <Input
            id="court-name"
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="e.g., Court A"
            required
          />
        </div>

        {/* Description */}
        <div>
          <Label htmlFor="court-desc">Description</Label>
          <Input
            id="court-desc"
            value={form.description}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="e.g., Main football court with floodlights"
          />
        </div>

        {/* Indoor + Surface Type */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="court-indoor">Type</Label>
            <div className="mt-1.5 flex gap-2">
              <button
                type="button"
                onClick={() => updateField('isIndoor', false)}
                className={`flex-1 rounded-md border px-3 py-2 text-sm transition-colors ${
                  !form.isIndoor
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-input hover:bg-accent'
                }`}
              >
                Outdoor
              </button>
              <button
                type="button"
                onClick={() => updateField('isIndoor', true)}
                className={`flex-1 rounded-md border px-3 py-2 text-sm transition-colors ${
                  form.isIndoor
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-input hover:bg-accent'
                }`}
              >
                Indoor
              </button>
            </div>
          </div>
          <div>
            <Label htmlFor="court-surface">Surface Type</Label>
            <SurfaceTypeSelect
              id="court-surface"
              value={form.surfaceType}
              onChange={(v) => updateField('surfaceType', v)}
            />
          </div>
        </div>

        {/* Dimensions + Max Players */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="court-dimensions">Dimensions</Label>
            <Input
              id="court-dimensions"
              value={form.dimensions}
              onChange={(e) => updateField('dimensions', e.target.value)}
              placeholder="e.g., 100x50 ft"
            />
          </div>
          <div>
            <Label htmlFor="court-players">Max Players</Label>
            <Input
              id="court-players"
              type="number"
              min="1"
              value={form.maxPlayers}
              onChange={(e) => updateField('maxPlayers', e.target.value)}
              placeholder="e.g., 14"
            />
          </div>
        </div>

        {/* Images */}
        <div>
          <Label>Images</Label>
          <div className="mt-1.5">
            <ImageUpload
              images={form.images}
              onChange={(imgs) => updateField('images', imgs)}
              folder="courts"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? 'Update Court' : 'Create Court'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

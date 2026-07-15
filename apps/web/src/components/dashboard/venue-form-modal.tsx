'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { INDIAN_STATES } from '@/lib/constants';
import { useToast } from '@/components/ui/toast';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { AmenitiesSelector } from '@/components/shared/amenities-selector';
import { ImageUpload } from '@/components/shared/image-upload';
import { TimeSelect } from '@/components/shared/time-select';
import { Loader2 } from 'lucide-react';

interface Venue {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode?: string;
  phone?: string;
  openTime: string;
  closeTime: string;
  amenities: string[];
  images: string[];
}

interface VenueFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  venue?: Venue | null;
}

export function VenueFormModal({ open, onClose, onSuccess, venue }: VenueFormModalProps) {
  const isEdit = !!venue;
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: venue?.name || '',
    address: venue?.address || '',
    city: venue?.city || '',
    state: venue?.state || '',
    pincode: venue?.pincode || '',
    phone: venue?.phone || '',
    openTime: venue?.openTime || '06:00',
    closeTime: venue?.closeTime || '23:00',
    amenities: venue?.amenities || [],
    images: venue?.images || [],
  });

  // Sync form when modal opens or venue prop changes
  useEffect(() => {
    if (open) {
      setForm({
        name: venue?.name || '',
        address: venue?.address || '',
        city: venue?.city || '',
        state: venue?.state || '',
        pincode: venue?.pincode || '',
        phone: venue?.phone || '',
        openTime: venue?.openTime || '06:00',
        closeTime: venue?.closeTime || '23:00',
        amenities: venue?.amenities || [],
        images: venue?.images || [],
      });
    }
  }, [open, venue]);

  // Reset form when venue changes
  const resetForm = () => {
    setForm({
      name: venue?.name || '',
      address: venue?.address || '',
      city: venue?.city || '',
      state: venue?.state || '',
      pincode: venue?.pincode || '',
      phone: venue?.phone || '',
      openTime: venue?.openTime || '06:00',
      closeTime: venue?.closeTime || '23:00',
      amenities: venue?.amenities || [],
      images: venue?.images || [],
    });
  };

  const handleClose = () => {
    resetForm();
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
        address: form.address,
        city: form.city,
        state: form.state,
        pincode: form.pincode || undefined,
        phone: form.phone || undefined,
        openTime: form.openTime,
        closeTime: form.closeTime,
        amenities: form.amenities.length > 0 ? form.amenities : undefined,
        images: form.images.length > 0 ? form.images : undefined,
      };

      if (isEdit) {
        await api.patch(`/venues/${venue.id}`, payload);
        toast('Venue updated successfully', 'success');
      } else {
        await api.post('/venues', payload);
        toast('Venue created successfully', 'success');
      }
      onSuccess();
    } catch (err: any) {
      const message = err.response?.data?.message;
      if (message?.includes('VENUE_LIMIT_REACHED') || message?.includes('maximum')) {
        toast('Venue limit reached. Please upgrade your plan.', 'error');
      } else if (message?.includes('SUBSCRIPTION_INACTIVE')) {
        toast('Your subscription is inactive. Please renew.', 'error');
      } else {
        toast(message || `Failed to ${isEdit ? 'update' : 'create'} venue`, 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={isEdit ? 'Edit Venue' : 'Add New Venue'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <Label htmlFor="venue-name">Venue Name *</Label>
          <Input
            id="venue-name"
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="e.g., SportArena Main"
            required
          />
        </div>

        {/* Address */}
        <div>
          <Label htmlFor="venue-address">Address *</Label>
          <Input
            id="venue-address"
            value={form.address}
            onChange={(e) => updateField('address', e.target.value)}
            placeholder="e.g., Andheri West, Near Metro Station"
            required
          />
        </div>

        {/* City + State */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="venue-city">City *</Label>
            <Input
              id="venue-city"
              value={form.city}
              onChange={(e) => updateField('city', e.target.value)}
              placeholder="e.g., Mumbai"
              required
            />
          </div>
          <div>
            <Label htmlFor="venue-state">State *</Label>
            <Select
              id="venue-state"
              value={form.state}
              onChange={(e) => updateField('state', e.target.value)}
              required
            >
              <option value="">Select state</option>
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Pincode + Phone */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="venue-pincode">Pincode</Label>
            <Input
              id="venue-pincode"
              value={form.pincode}
              onChange={(e) => updateField('pincode', e.target.value)}
              placeholder="e.g., 400058"
              pattern="\d{6}"
              maxLength={6}
            />
          </div>
          <div>
            <Label htmlFor="venue-phone">Phone</Label>
            <Input
              id="venue-phone"
              value={form.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              placeholder="e.g., +919876543210"
            />
          </div>
        </div>

        {/* Open/Close Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="venue-open">Opening Time *</Label>
            <TimeSelect
              id="venue-open"
              value={form.openTime}
              onChange={(v) => updateField('openTime', v)}
              required
            />
          </div>
          <div>
            <Label htmlFor="venue-close">Closing Time *</Label>
            <TimeSelect
              id="venue-close"
              value={form.closeTime}
              onChange={(v) => updateField('closeTime', v)}
              required
            />
          </div>
        </div>

        {/* Amenities */}
        <div>
          <Label>Amenities</Label>
          <div className="mt-1.5">
            <AmenitiesSelector
              selected={form.amenities}
              onChange={(a) => updateField('amenities', a)}
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
              folder="venues"
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
            {isEdit ? 'Update Venue' : 'Create Venue'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

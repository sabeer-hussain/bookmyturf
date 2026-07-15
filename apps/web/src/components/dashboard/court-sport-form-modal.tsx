'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { PriceInput } from '@/components/shared/price-input';
import { Loader2 } from 'lucide-react';

interface Sport {
  id: string;
  name: string;
  icon: string;
}

interface CourtSport {
  id: string;
  sportId: string;
  baseSlotMinutes: number;
  pricePerSlot: string;
  peakPricePerSlot: string | null;
  maxConsecutiveSlots: number;
  sport: Sport;
}

interface CourtSportFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  courtId: string;
  courtSport?: CourtSport | null;
  existingSportIds: string[];
}

export function CourtSportFormModal({
  open,
  onClose,
  onSuccess,
  courtId,
  courtSport,
  existingSportIds,
}: CourtSportFormModalProps) {
  const isEdit = !!courtSport;
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [sports, setSports] = useState<Sport[]>([]);

  const [form, setForm] = useState({
    sportId: courtSport?.sportId || '',
    baseSlotMinutes: courtSport?.baseSlotMinutes?.toString() || '60',
    pricePerSlot: courtSport?.pricePerSlot || '',
    peakPricePerSlot: courtSport?.peakPricePerSlot || '',
    maxConsecutiveSlots: courtSport?.maxConsecutiveSlots?.toString() || '4',
  });

  // Sync form when modal opens or courtSport prop changes
  useEffect(() => {
    if (open) {
      setForm({
        sportId: courtSport?.sportId || '',
        baseSlotMinutes: courtSport?.baseSlotMinutes?.toString() || '60',
        pricePerSlot: courtSport?.pricePerSlot || '',
        peakPricePerSlot: courtSport?.peakPricePerSlot || '',
        maxConsecutiveSlots: courtSport?.maxConsecutiveSlots?.toString() || '4',
      });
    }
  }, [open, courtSport]);

  useEffect(() => {
    api
      .get('/sports')
      .then((res) => setSports(res.data.data))
      .catch(() => {});
  }, []);

  const handleClose = () => {
    setForm({
      sportId: courtSport?.sportId || '',
      baseSlotMinutes: courtSport?.baseSlotMinutes?.toString() || '60',
      pricePerSlot: courtSport?.pricePerSlot || '',
      peakPricePerSlot: courtSport?.peakPricePerSlot || '',
      maxConsecutiveSlots: courtSport?.maxConsecutiveSlots?.toString() || '4',
    });
    onClose();
  };

  const updateField = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const availableSports = sports.filter(
    (s) => !existingSportIds.includes(s.id) || s.id === courtSport?.sportId,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.pricePerSlot || parseFloat(form.pricePerSlot) <= 0) {
      toast('Price per slot must be greater than 0', 'error');
      return;
    }

    setSubmitting(true);

    try {
      if (isEdit) {
        await api.patch(`/court-sports/${courtSport.id}`, {
          baseSlotMinutes: parseInt(form.baseSlotMinutes),
          pricePerSlot: parseFloat(form.pricePerSlot),
          peakPricePerSlot: form.peakPricePerSlot ? parseFloat(form.peakPricePerSlot) : undefined,
          maxConsecutiveSlots: parseInt(form.maxConsecutiveSlots),
        });
        toast('Sport configuration updated', 'success');
      } else {
        await api.post(`/courts/${courtId}/sports`, {
          sportId: form.sportId,
          baseSlotMinutes: parseInt(form.baseSlotMinutes),
          pricePerSlot: parseFloat(form.pricePerSlot),
          peakPricePerSlot: form.peakPricePerSlot ? parseFloat(form.peakPricePerSlot) : undefined,
          maxConsecutiveSlots: parseInt(form.maxConsecutiveSlots),
        });
        toast('Sport added to court', 'success');
      }
      onSuccess();
    } catch (err: any) {
      const message = err.response?.data?.message;
      if (message?.includes('already configured')) {
        toast('This sport is already configured for this court', 'error');
      } else {
        toast(message || `Failed to ${isEdit ? 'update' : 'add'} sport`, 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={isEdit ? `Edit ${courtSport.sport.name} Config` : 'Add Sport to Court'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Sport Selection (only for add) */}
        {!isEdit && (
          <div>
            <Label htmlFor="cs-sport">Sport *</Label>
            <Select
              id="cs-sport"
              value={form.sportId}
              onChange={(e) => updateField('sportId', e.target.value)}
              required
            >
              <option value="">Select a sport</option>
              {availableSports.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            {availableSports.length === 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                All sports are already configured for this court.
              </p>
            )}
          </div>
        )}

        {/* Price per Slot */}
        <div>
          <Label htmlFor="cs-price">Price per Slot *</Label>
          <PriceInput
            id="cs-price"
            value={form.pricePerSlot}
            onChange={(v) => updateField('pricePerSlot', v?.toString() || '')}
            placeholder="800"
            required
          />
        </div>

        {/* Peak Price */}
        <div>
          <Label htmlFor="cs-peak">Peak Hour Price</Label>
          <PriceInput
            id="cs-peak"
            value={form.peakPricePerSlot}
            onChange={(v) => updateField('peakPricePerSlot', v?.toString() || '')}
            placeholder="1200 (optional)"
          />
        </div>

        {/* Slot Duration + Max Consecutive */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="cs-duration">Slot Duration (min)</Label>
            <Input
              id="cs-duration"
              type="number"
              min="1"
              value={form.baseSlotMinutes}
              onChange={(e) => updateField('baseSlotMinutes', e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="cs-max">Max Consecutive Slots</Label>
            <Input
              id="cs-max"
              type="number"
              min="1"
              value={form.maxConsecutiveSlots}
              onChange={(e) => updateField('maxConsecutiveSlots', e.target.value)}
              required
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || (!isEdit && !form.sportId)}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? 'Update Config' : 'Add Sport'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

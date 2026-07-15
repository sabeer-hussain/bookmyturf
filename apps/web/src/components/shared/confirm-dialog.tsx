'use client';

import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  loading?: boolean;
  variant?: 'danger' | 'warning';
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  loading = false,
  variant = 'danger',
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} size="sm">
      <div className="flex flex-col items-center text-center">
        <div
          className={`mb-4 rounded-full p-3 ${
            variant === 'danger' ? 'bg-destructive/10' : 'bg-yellow-100'
          }`}
        >
          <AlertTriangle
            className={`h-6 w-6 ${variant === 'danger' ? 'text-destructive' : 'text-yellow-600'}`}
          />
        </div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <div className="mt-6 flex w-full gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1" disabled={loading}>
            Cancel
          </Button>
          <Button
            variant={variant === 'danger' ? 'destructive' : 'default'}
            onClick={onConfirm}
            className="flex-1"
            disabled={loading}
          >
            {loading ? 'Processing...' : confirmLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

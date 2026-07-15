'use client';

import { useCallback, useState } from 'react';
import { api } from '@/lib/api-client';
import { UPLOAD_CONFIG } from '@/lib/constants';
import { useToast } from '@/components/ui/toast';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import axios from 'axios';

interface ImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  folder: 'venues' | 'courts';
  maxImages?: number;
}

export function ImageUpload({
  images,
  onChange,
  folder,
  maxImages = UPLOAD_CONFIG.maxFiles,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (!files.length) return;

      const remaining = maxImages - images.length;
      if (files.length > remaining) {
        toast(`You can only add ${remaining} more image${remaining === 1 ? '' : 's'}`, 'error');
        return;
      }

      for (const file of files) {
        if (file.size > UPLOAD_CONFIG.maxSizeBytes) {
          toast(`${file.name} exceeds ${UPLOAD_CONFIG.maxSizeMB}MB limit`, 'error');
          return;
        }
        if (!(UPLOAD_CONFIG.acceptedTypes as readonly string[]).includes(file.type)) {
          toast(`${file.name} is not a supported format (JPEG, PNG, WebP)`, 'error');
          return;
        }
      }

      setUploading(true);
      try {
        const uploadedUrls: string[] = [];

        for (const file of files) {
          const { data } = await api.post('/uploads/presigned', {
            fileName: file.name,
            fileType: file.type,
            folder,
          });

          const { uploadUrl, fileUrl } = data.data;

          await axios.put(uploadUrl, file, {
            headers: { 'Content-Type': file.type },
          });

          uploadedUrls.push(fileUrl);
        }

        onChange([...images, ...uploadedUrls]);
        toast('Image uploaded successfully', 'success');
      } catch {
        toast('Failed to upload image', 'error');
      } finally {
        setUploading(false);
        e.target.value = '';
      }
    },
    [images, onChange, folder, maxImages, toast],
  );

  const handleRemove = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {/* Preview grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {images.map((url, i) => (
            <div key={i} className="group relative aspect-square rounded-md overflow-hidden border">
              <img src={url} alt={`Upload ${i + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => handleRemove(i)}
                className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Remove image"
              >
                <Trash2 className="h-4 w-4 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {images.length < maxImages && (
        <label
          className={`flex cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-dashed px-4 py-6 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-accent ${
            uploading ? 'pointer-events-none opacity-50' : ''
          }`}
        >
          {uploading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <ImagePlus className="h-5 w-5" />
              <span>
                Add image ({images.length}/{maxImages})
              </span>
            </>
          )}
          <input
            type="file"
            accept={UPLOAD_CONFIG.acceptedExtensions}
            multiple
            onChange={handleFileSelect}
            disabled={uploading}
            className="sr-only"
          />
        </label>
      )}
    </div>
  );
}

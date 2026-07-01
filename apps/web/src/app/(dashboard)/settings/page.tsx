'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/contexts/auth-context';
import { useTenant } from '@/contexts/tenant-context';
import { api } from '@/lib/api-client';
import { Loader2, Upload } from 'lucide-react';

export default function SettingsPage() {
  const { user, refetchUser } = useAuth();
  const { tenant } = useTenant();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    gender: (user as any)?.gender || '',
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast('File size must be under 5MB', 'error');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast('Only JPEG, PNG, and WebP allowed', 'error');
      return;
    }

    setIsUploading(true);
    try {
      const { data } = await api.post('/uploads/presigned', {
        fileName: file.name,
        fileType: file.type,
        folder: 'avatars',
      });
      // Upload file to the presigned URL
      await fetch(data.data.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });
      setAvatarPreview(data.data.fileUrl);
      await api.patch(`/users/${user?.id}`, { avatar: data.data.fileUrl });
      await refetchUser();
      toast('Avatar updated', 'success');
    } catch {
      toast('Failed to upload avatar', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.patch(`/users/${user?.id}`, {
        firstName: formData.firstName,
        lastName: formData.lastName || undefined,
        gender: formData.gender || undefined,
      });
      toast('Profile updated', 'success');
      await refetchUser();
      setIsEditing(false);
    } catch (err: any) {
      toast(err.response?.data?.message || 'Failed to update', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Profile Settings</h1>

      {/* Avatar Section */}
      <Card>
        <CardContent className="flex items-center gap-4 p-6">
          <Avatar className="h-16 w-16">
            {avatarPreview || user?.avatar ? (
              <AvatarImage src={avatarPreview || user?.avatar || ''} />
            ) : (
              <AvatarFallback className="text-lg">{user?.firstName?.[0] || 'U'}</AvatarFallback>
            )}
          </Avatar>
          <div className="flex-1">
            <p className="font-medium">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-sm text-muted-foreground">{user?.role?.replace('_', ' ')}</p>
          </div>
          <label className="cursor-pointer">
            <div className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3">
              {isUploading ? (
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              ) : (
                <Upload className="mr-2 h-3 w-3" />
              )}
              Upload
            </div>
            <input
              type="file"
              className="hidden"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarUpload}
            />
          </label>
        </CardContent>
      </Card>

      {/* Profile Info */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Personal Information</CardTitle>
          {!isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFormData({
                  firstName: user?.firstName || '',
                  lastName: user?.lastName || '',
                  gender: (user as any)?.gender || '',
                });
                setIsEditing(true);
              }}
            >
              Edit
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                >
                  <option value="">Select</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save
                </Button>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">First Name</span>
                <span>{user?.firstName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Name</span>
                <span>{user?.lastName || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gender</span>
                <span>{(user as any)?.gender || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span>{user?.phone || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span>{user?.email || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Role</span>
                <Badge>{user?.role?.replace('_', ' ')}</Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tenant Info */}
      {tenant && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Business</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Business</span>
              <span>{tenant.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">URL</span>
              <span>bookmyturf.in/{tenant.slug}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span>{tenant.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone</span>
              <span>{tenant.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Address</span>
              <span>{tenant.address || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">City</span>
              <span>{tenant.city || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">State</span>
              <span>{tenant.state || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pincode</span>
              <span>{tenant.pincode || '—'}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

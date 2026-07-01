'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api-client';
import { Check, Loader2 } from 'lucide-react';

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Delhi',
  'Chandigarh',
];

interface FormData {
  name: string;
  phone: string;
  email: string;
  slug: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    phone: '',
    email: '',
    slug: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
  });
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugChecking, setSlugChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => {
      if (field === 'slug' && prev.slug !== value) setSlugAvailable(null);
      return { ...prev, [field]: value };
    });
  };

  const slugTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!formData.slug || formData.slug.length < 3) {
      setSlugAvailable(null);
      return;
    }
    if (slugTimer.current) clearTimeout(slugTimer.current);
    slugTimer.current = setTimeout(async () => {
      setSlugChecking(true);
      try {
        const { data } = await api.get(`/tenants/slug/${formData.slug}`);
        setSlugAvailable(data.data.available);
      } catch {
        setSlugAvailable(null);
      } finally {
        setSlugChecking(false);
      }
    }, 500);
    return () => {
      if (slugTimer.current) clearTimeout(slugTimer.current);
    };
  }, [formData.slug]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await api.post('/tenants/onboard', formData);
      toast('Business setup complete!', 'success');
      setTimeout(() => {
        window.location.href = '/bookings';
      }, 1500);
    } catch (err: any) {
      toast(err.response?.data?.message || 'Failed to complete setup', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = ['Business Info', 'URL Slug', 'Location', 'Review'];
  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const canNext = () => {
    if (step === 1)
      return formData.name && formData.phone && formData.email && isValidEmail(formData.email);
    if (step === 2) return formData.slug && slugAvailable === true;
    if (step === 3) return formData.city;
    return true;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-8">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Set Up Your Business</CardTitle>
          <div className="flex justify-center gap-2 pt-4">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center gap-1">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                    i + 1 < step
                      ? 'bg-primary text-primary-foreground'
                      : i + 1 === step
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {i + 1 < step ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                {i < steps.length - 1 && (
                  <div className={`h-0.5 w-6 ${i + 1 < step ? 'bg-primary' : 'bg-muted'}`} />
                )}
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground pt-2">{steps[step - 1]}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label>Business Name *</Label>
                <Input
                  placeholder="e.g., Sport Arena"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Business Phone *</Label>
                <div className="flex gap-2">
                  <div className="flex h-10 items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
                    +91
                  </div>
                  <Input
                    placeholder="9876543210"
                    value={formData.phone.replace('+91', '')}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                      updateField('phone', digits ? `+91${digits}` : '');
                    }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Business Email *</Label>
                <Input
                  type="email"
                  placeholder="owner@business.com"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                />
              </div>
            </>
          )}

          {step === 2 && (
            <div className="space-y-2">
              <Label>Choose Your URL</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">bookmyturf.in/</span>
                <Input
                  placeholder="your-turf-name"
                  value={formData.slug}
                  onChange={(e) =>
                    updateField('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                  }
                />
              </div>
              {slugChecking && <p className="text-sm text-muted-foreground">Checking...</p>}
              {slugAvailable === true && <p className="text-sm text-primary">✓ Available</p>}
              {slugAvailable === false && (
                <p className="text-sm text-destructive">✗ Already taken</p>
              )}
              <p className="text-xs text-muted-foreground">
                Lowercase letters, numbers, and hyphens only (3-50 chars)
              </p>
            </div>
          )}

          {step === 3 && (
            <>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  placeholder="Street address"
                  value={formData.address}
                  onChange={(e) => updateField('address', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>City *</Label>
                  <Input
                    placeholder="Mumbai"
                    value={formData.city}
                    onChange={(e) => updateField('city', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Select
                    value={formData.state}
                    onChange={(e) => updateField('state', e.target.value)}
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
              <div className="space-y-2">
                <Label>Pincode</Label>
                <Input
                  placeholder="400001"
                  value={formData.pincode}
                  onChange={(e) =>
                    updateField('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                />
              </div>
            </>
          )}

          {step === 4 && (
            <div className="space-y-3 text-sm">
              <h3 className="font-semibold">Confirm Your Details</h3>
              <div className="rounded-lg border p-4 space-y-2">
                <p>
                  <span className="text-muted-foreground">Business:</span> {formData.name}
                </p>
                <p>
                  <span className="text-muted-foreground">URL:</span> bookmyturf.in/{formData.slug}
                </p>
                <p>
                  <span className="text-muted-foreground">Phone:</span> {formData.phone}
                </p>
                <p>
                  <span className="text-muted-foreground">Email:</span> {formData.email}
                </p>
                <p>
                  <span className="text-muted-foreground">Location:</span> {formData.city}
                  {formData.state ? `, ${formData.state}` : ''}
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4">
            {step > 1 ? (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            ) : (
              <div />
            )}
            {step < 4 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canNext()}>
                Next
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Complete Setup
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

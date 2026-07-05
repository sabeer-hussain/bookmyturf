'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api-client';
import { Check } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  maxVenues: number;
  maxCourts: number;
  maxStaff: number;
  features: Record<string, boolean>;
}

interface Subscription {
  planId: string;
  planName: string;
  status: string;
  trialDaysLeft: number;
}

export default function BillingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [plansRes, subRes] = await Promise.all([
          api.get('/plans'),
          api.get('/subscriptions/current').catch(() => null),
        ]);
        setPlans(plansRes.data.data);
        if (subRes) setSubscription(subRes.data.data);
      } catch {
        // Plans might not be seeded yet
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading plans...</p>
      </div>
    );
  }

  const featureLabels: Record<string, string> = {
    booking: 'Online Booking',
    analytics: 'Analytics Dashboard',
    whatsappNotifications: 'WhatsApp Notifications',
    emailNotifications: 'Email Notifications',
    customBranding: 'Custom Branding',
    prioritySupport: 'Priority Support',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Billing & Plans</h1>
        <p className="text-muted-foreground">Manage your subscription and billing</p>
      </div>

      {subscription && (
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="font-medium">
                Current Plan: <span className="text-primary">{subscription.planName}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Status: {subscription.status}
                {subscription.trialDaysLeft > 0 &&
                  ` • ${subscription.trialDaysLeft} days left in trial`}
              </p>
            </div>
            <Badge variant={subscription.status === 'TRIAL' ? 'secondary' : 'default'}>
              {subscription.status}
            </Badge>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = subscription?.planId === plan.id;
          return (
            <Card
              key={plan.id}
              className={isCurrent ? 'border-primary ring-2 ring-primary/20' : ''}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{plan.name}</CardTitle>
                  {isCurrent && <Badge>Your Plan</Badge>}
                </div>
                <CardDescription>{plan.description}</CardDescription>
                <div className="pt-2">
                  <span className="text-3xl font-bold">₹{plan.monthlyPrice}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <p className="font-medium">Limits</p>
                  <p className="text-muted-foreground">
                    {plan.maxVenues >= 999 ? 'Unlimited' : plan.maxVenues} venues
                  </p>
                  <p className="text-muted-foreground">
                    {plan.maxCourts >= 999 ? 'Unlimited' : plan.maxCourts} courts
                  </p>
                  <p className="text-muted-foreground">
                    {plan.maxStaff >= 999 ? 'Unlimited' : plan.maxStaff} staff
                  </p>
                </div>
                <div className="space-y-2 text-sm">
                  <p className="font-medium">Features</p>
                  {Object.entries(plan.features).map(([key, enabled]) => (
                    <div key={key} className="flex items-center gap-2">
                      <Check
                        className={`h-4 w-4 ${enabled ? 'text-primary' : 'text-muted-foreground/30'}`}
                      />
                      <span className={enabled ? '' : 'text-muted-foreground line-through'}>
                        {featureLabels[key] || key}
                      </span>
                    </div>
                  ))}
                </div>
                <Button
                  className="w-full"
                  variant={isCurrent ? 'outline' : 'default'}
                  disabled={isCurrent}
                >
                  {isCurrent ? 'Current Plan' : 'Upgrade'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

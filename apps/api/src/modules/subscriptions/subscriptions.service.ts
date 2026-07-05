import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  async listPlans() {
    return this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { monthlyPrice: 'asc' },
    });
  }

  async getCurrentSubscription(tenantId: string) {
    if (!tenantId) throw new NotFoundException('No tenant associated');

    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });

    if (!subscription) throw new NotFoundException('No subscription found');

    const now = new Date();
    const trialDaysLeft = subscription.trialEndsAt
      ? Math.max(
          0,
          Math.ceil((subscription.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        )
      : 0;

    return {
      id: subscription.id,
      status: subscription.status,
      planName: subscription.plan.name,
      planId: subscription.planId,
      trialEndsAt: subscription.trialEndsAt,
      trialDaysLeft,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      limits: {
        maxVenues: subscription.plan.maxVenues,
        maxCourts: subscription.plan.maxCourts,
        maxStaff: subscription.plan.maxStaff,
      },
      features: subscription.plan.features,
    };
  }
}

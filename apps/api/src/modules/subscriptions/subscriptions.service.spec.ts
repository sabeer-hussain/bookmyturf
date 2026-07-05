import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionsService } from './subscriptions.service';

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let prisma: Record<string, any>;

  beforeEach(async () => {
    prisma = {
      plan: { findMany: jest.fn() },
      subscription: { findUnique: jest.fn() },
    };
    const module = await Test.createTestingModule({
      providers: [SubscriptionsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(SubscriptionsService);
  });

  describe('listPlans', () => {
    it('returns active plans ordered by price', async () => {
      const plans = [
        { id: 'p1', name: 'Starter', monthlyPrice: 999 },
        { id: 'p2', name: 'Pro', monthlyPrice: 2499 },
      ];
      prisma.plan.findMany.mockResolvedValue(plans);
      const result = await service.listPlans();
      expect(result).toHaveLength(2);
      expect(prisma.plan.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { monthlyPrice: 'asc' },
      });
    });
  });

  describe('getCurrentSubscription', () => {
    it('returns subscription with trialDaysLeft', async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      prisma.subscription.findUnique.mockResolvedValue({
        id: 's1',
        tenantId: 't1',
        planId: 'p1',
        status: 'TRIAL',
        trialEndsAt: futureDate,
        currentPeriodStart: new Date(),
        currentPeriodEnd: futureDate,
        plan: { name: 'Starter', maxVenues: 3, maxCourts: 5, maxStaff: 3, features: {} },
      });

      const result = await service.getCurrentSubscription('t1');
      expect(result.planName).toBe('Starter');
      expect(result.status).toBe('TRIAL');
      expect(result.trialDaysLeft).toBeGreaterThan(0);
      expect(result.limits.maxVenues).toBe(3);
    });

    it('throws if no tenantId', async () => {
      await expect(service.getCurrentSubscription('')).rejects.toThrow(NotFoundException);
    });

    it('throws if no subscription found', async () => {
      prisma.subscription.findUnique.mockResolvedValue(null);
      await expect(service.getCurrentSubscription('t1')).rejects.toThrow(NotFoundException);
    });
  });
});

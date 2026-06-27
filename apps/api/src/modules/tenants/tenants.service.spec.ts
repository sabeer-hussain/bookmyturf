import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantsService } from './tenants.service';

describe('TenantsService', () => {
  let service: TenantsService;
  let prisma: Record<string, any>;

  beforeEach(async () => {
    prisma = {
      tenant: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      user: { findUnique: jest.fn(), update: jest.fn() },
      plan: { findFirst: jest.fn() },
      subscription: { create: jest.fn() },
    };

    const module = await Test.createTestingModule({
      providers: [TenantsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(TenantsService);
  });

  describe('onboard', () => {
    const dto = {
      name: 'SportArena',
      slug: 'sportarena',
      phone: '+919876543210',
      email: 'test@test.com',
    };

    it('creates tenant, updates user, creates trial subscription', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', tenantId: null });
      prisma.tenant.create.mockResolvedValue({ id: 't1', ...dto });
      prisma.user.update.mockResolvedValue({});
      prisma.plan.findFirst.mockResolvedValue({ id: 'p1' });
      prisma.subscription.create.mockResolvedValue({});

      const result = await service.onboard('u1', dto);
      expect(result.id).toBe('t1');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { tenantId: 't1', role: 'TURF_OWNER' } }),
      );
      expect(prisma.subscription.create).toHaveBeenCalled();
    });

    it('throws if slug taken', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(service.onboard('u1', dto)).rejects.toThrow(BadRequestException);
    });

    it('throws if user already has tenant', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', tenantId: 'existing' });
      await expect(service.onboard('u1', dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('checkSlug', () => {
    it('returns available true when slug is free', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);
      const result = await service.checkSlug('new-slug');
      expect(result).toEqual({ available: true, slug: 'new-slug' });
    });

    it('returns available false when slug is taken', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ id: 't1' });
      const result = await service.checkSlug('taken');
      expect(result).toEqual({ available: false, slug: 'taken' });
    });
  });

  describe('findById', () => {
    it('returns tenant for owner', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ id: 't1', name: 'Test' });
      const result = await service.findById('t1', 'u1', 'TURF_OWNER', 't1');
      expect(result.name).toBe('Test');
    });

    it('throws 403 if user not owner of tenant', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ id: 't1' });
      await expect(service.findById('t1', 'u1', 'TURF_OWNER', 't2')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('allows super admin', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ id: 't1', name: 'Test' });
      const result = await service.findById('t1', 'u1', 'SUPER_ADMIN', null);
      expect(result.name).toBe('Test');
    });

    it('throws 404 if tenant not found', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);
      await expect(service.findById('xxx', 'u1', 'SUPER_ADMIN', null)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deactivate', () => {
    it('sets isActive to false', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ id: 't1' });
      prisma.tenant.update.mockResolvedValue({ id: 't1', isActive: false });
      const result = await service.deactivate('t1');
      expect(result.isActive).toBe(false);
    });

    it('throws 404 if not found', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);
      await expect(service.deactivate('xxx')).rejects.toThrow(NotFoundException);
    });
  });
});

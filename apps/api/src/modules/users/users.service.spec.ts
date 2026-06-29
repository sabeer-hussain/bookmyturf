import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: Record<string, any>;

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), update: jest.fn() },
    };
    const module = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(UsersService);
  });

  describe('findById', () => {
    it('returns user for self', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        firstName: 'Test',
        refreshToken: 'hash',
      });
      const result = await service.findById('u1', 'u1', 'CUSTOMER');
      expect(result.firstName).toBe('Test');
      expect(result).not.toHaveProperty('refreshToken');
    });

    it('returns user for super admin', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        firstName: 'Test',
        refreshToken: 'hash',
      });
      const result = await service.findById('u1', 'admin', 'SUPER_ADMIN');
      expect(result.firstName).toBe('Test');
    });

    it('throws 403 for other user', async () => {
      await expect(service.findById('u1', 'u2', 'CUSTOMER')).rejects.toThrow(ForbiddenException);
    });

    it('throws 404 if not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.findById('u1', 'u1', 'CUSTOMER')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates own profile', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
      prisma.user.update.mockResolvedValue({ id: 'u1', firstName: 'New', refreshToken: 'hash' });
      const result = await service.update('u1', { firstName: 'New' }, 'u1', 'CUSTOMER');
      expect(result.firstName).toBe('New');
      expect(result).not.toHaveProperty('refreshToken');
    });

    it('throws 403 for other user', async () => {
      await expect(service.update('u1', { firstName: 'X' }, 'u2', 'CUSTOMER')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});

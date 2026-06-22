import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { TenantGuard } from './tenant.guard';

const mockContext = (user: any, headers: any = {}): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ user, headers, tenantId: headers['x-tenant-id'] }),
    }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
  }) as any;

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('allows access when no roles required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = mockContext({ role: 'CUSTOMER' });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows access when user has required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['TURF_OWNER']);
    const context = mockContext({ role: 'TURF_OWNER' });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('throws ForbiddenException when role insufficient', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['SUPER_ADMIN']);
    const context = mockContext({ role: 'CUSTOMER' });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when no user', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['CUSTOMER']);
    const context = mockContext(null);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});

describe('TenantGuard', () => {
  let guard: TenantGuard;

  beforeEach(() => {
    guard = new TenantGuard();
  });

  it('allows access when user tenantId matches header', () => {
    const context = mockContext({ tenantId: 'tenant-1' }, { 'x-tenant-id': 'tenant-1' });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('throws when tenantId mismatch', () => {
    const context = mockContext({ tenantId: 'tenant-1' }, { 'x-tenant-id': 'tenant-2' });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('throws when no tenant context', () => {
    const context = mockContext({ tenantId: 'tenant-1' }, {});
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('throws when no user', () => {
    const context = mockContext(null, { 'x-tenant-id': 'tenant-1' });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});

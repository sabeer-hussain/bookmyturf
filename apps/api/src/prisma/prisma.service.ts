import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'async_hooks';

export const tenantContext = new AsyncLocalStorage<{ tenantId: string | null }>();

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
    this.addTenantMiddleware();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  private addTenantMiddleware() {
    this.$use(async (params, next) => {
      const store = tenantContext.getStore();
      const tenantId = store?.tenantId;
      const tenantScopedModels = ['Venue', 'Court', 'Booking', 'Slot', 'CourtSport'];

      if (!tenantId || !tenantScopedModels.includes(params.model || '')) {
        return next(params);
      }

      if (params.action === 'findMany' || params.action === 'findFirst') {
        params.args = params.args || {};
        params.args.where = { ...params.args.where, tenantId };
      }

      if (params.action === 'create') {
        params.args = params.args || {};
        params.args.data = { ...params.args.data, tenantId };
      }

      if (params.action === 'update' || params.action === 'updateMany') {
        params.args = params.args || {};
        params.args.where = { ...params.args.where, tenantId };
      }

      if (params.action === 'delete' || params.action === 'deleteMany') {
        params.args = params.args || {};
        params.args.where = { ...params.args.where, tenantId };
      }

      return next(params);
    });
  }
}

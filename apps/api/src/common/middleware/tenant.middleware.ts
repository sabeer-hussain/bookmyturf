import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { tenantContext } from '../../prisma/prisma.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const tenantId = (req.headers['x-tenant-id'] as string) || null;
    (req as any).tenantId = tenantId;
    tenantContext.run({ tenantId }, () => next());
  }
}

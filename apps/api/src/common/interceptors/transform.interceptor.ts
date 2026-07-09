import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((response) => {
        // Paginated response: { data: [...], meta: { page, limit, total, totalPages } }
        if (response && response.data !== undefined && response.meta !== undefined) {
          return { success: true, data: response.data, meta: response.meta };
        }

        // Standard response: wrap in { success: true, data }
        return { success: true, data: response };
      }),
    );
  }
}

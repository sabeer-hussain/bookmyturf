import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorResponse } from '@bookmyturf/shared';

/**
 * Global catch-all exception filter.
 *
 * Normalizes every error into the documented envelope:
 * `{ success: false, error: { code, message, details? } }`.
 *
 * Rules:
 * - Business exceptions that already carry a `{ code, message }` payload keep their code.
 * - class-validator failures (400 with a `message` array) → `VALIDATION_ERROR` + `details`.
 * - Other `HttpException`s → a stable code derived from the HTTP status; message preserved verbatim.
 * - Anything non-HTTP (unexpected runtime/Prisma errors) → `500 INTERNAL_ERROR` with a generic
 *   message; the real error is logged server-side and never leaked to the client.
 *
 * Registered via `APP_FILTER` in `AppModule` so it also applies in e2e (which boots `AppModule`).
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  /** HTTP status → stable machine-readable error code. */
  private static readonly STATUS_CODE_MAP: Record<number, string> = {
    [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
    [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
    [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
    [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
    [HttpStatus.CONFLICT]: 'CONFLICT',
    [HttpStatus.TOO_MANY_REQUESTS]: 'RATE_LIMIT_EXCEEDED',
  };

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, body } = this.normalize(exception);

    // Log server faults (5xx) with full detail; client errors (4xx) are expected — debug only.
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} ${status} ${body.error.code}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.debug(`${request.method} ${request.url} ${status} ${body.error.code}`);
    }

    response.status(status).json(body);
  }

  /** Map any thrown value to an `{ status, ErrorResponse }` pair. */
  private normalize(exception: unknown): { status: number; body: ErrorResponse } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      return { status, body: this.fromHttpException(status, payload) };
    }

    // Unexpected non-HTTP error → generic 500; do not leak internals.
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
    };
  }

  /**
   * Build the envelope from an `HttpException`'s status + response payload.
   * The payload may be a string, a business `{ code, message }` object, or the default
   * validation object `{ message: string | string[], error, statusCode }`.
   */
  private fromHttpException(status: number, payload: string | object): ErrorResponse {
    // Any server-fault (5xx) HttpException is treated like an unexpected error: never leak the
    // payload/message to the client (it may carry internals); the real detail is logged in `catch`.
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      };
    }

    // String payload (e.g. `new ForbiddenException('Access denied')`, ThrottlerException).
    if (typeof payload === 'string') {
      return { success: false, error: { code: this.codeForStatus(status), message: payload } };
    }

    const obj = payload as Record<string, unknown>;

    // Business exception carrying an explicit code — preserve it.
    if (typeof obj.code === 'string') {
      return {
        success: false,
        error: { code: obj.code, message: this.messageOf(obj.message) },
      };
    }

    // class-validator failure: 400 with a `message` array → VALIDATION_ERROR + details.
    if (status === HttpStatus.BAD_REQUEST && Array.isArray(obj.message)) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: (obj.message as unknown[]).map((m) => String(m)),
        },
      };
    }

    // Default NestJS shape: `{ message, error, statusCode }` — derive code from status.
    return {
      success: false,
      error: { code: this.codeForStatus(status), message: this.messageOf(obj.message) },
    };
  }

  private codeForStatus(status: number): string {
    return HttpExceptionFilter.STATUS_CODE_MAP[status] ?? 'INTERNAL_ERROR';
  }

  private messageOf(message: unknown): string {
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.map((m) => String(m)).join(', ');
    return 'An error occurred';
  }
}

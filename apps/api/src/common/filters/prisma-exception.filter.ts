import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ErrorResponse } from '@bookmyturf/shared';

/**
 * Catches Prisma known-request errors and maps them to the error envelope with **generic**
 * client-facing messages (the raw Prisma message — which can leak table/column/constraint
 * names — is logged server-side, never returned).
 *
 * Registered before {@link HttpExceptionFilter} via `APP_FILTER`; the more specific
 * `@Catch(Prisma.PrismaClientKnownRequestError)` takes precedence for Prisma errors, while the
 * catch-all handles everything else. In normal flows services guard the common conflicts first,
 * so this is primarily a safety net that keeps any leaked DB error inside the envelope.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('PrismaExceptionFilter');

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, body } = this.map(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} ${status} prisma:${exception.code}`,
        exception.stack,
      );
    } else {
      this.logger.debug(`${request.method} ${request.url} ${status} prisma:${exception.code}`);
    }

    response.status(status).json(body);
  }

  private map(exception: Prisma.PrismaClientKnownRequestError): {
    status: number;
    body: ErrorResponse;
  } {
    switch (exception.code) {
      case 'P2002': // Unique constraint violation
        return this.envelope(
          HttpStatus.CONFLICT,
          'CONFLICT',
          'A record with these details already exists',
        );
      case 'P2025': // Record required for the operation was not found
        return this.envelope(
          HttpStatus.NOT_FOUND,
          'NOT_FOUND',
          'The requested resource was not found',
        );
      case 'P2003': // Foreign key constraint failed
        return this.envelope(
          HttpStatus.BAD_REQUEST,
          'BAD_REQUEST',
          'The request references a resource that does not exist',
        );
      default:
        return this.envelope(
          HttpStatus.INTERNAL_SERVER_ERROR,
          'INTERNAL_ERROR',
          'Internal server error',
        );
    }
  }

  private envelope(
    status: number,
    code: string,
    message: string,
  ): { status: number; body: ErrorResponse } {
    return { status, body: { success: false, error: { code, message } } };
  }
}

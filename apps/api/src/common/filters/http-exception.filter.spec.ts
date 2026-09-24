import {
  ArgumentsHost,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

/** Capture the status + JSON body the filter writes to the response. */
function runFilter(exception: unknown): { status: number; body: any } {
  const filter = new HttpExceptionFilter();
  let capturedStatus = 0;
  let capturedBody: any;
  const response = {
    status: (s: number) => {
      capturedStatus = s;
      return response;
    },
    json: (b: any) => {
      capturedBody = b;
      return response;
    },
  };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => ({ method: 'GET', url: '/v1/test' }),
    }),
  } as unknown as ArgumentsHost;

  filter.catch(exception, host);
  return { status: capturedStatus, body: capturedBody };
}

describe('HttpExceptionFilter', () => {
  it('preserves a business exception code (no details)', () => {
    const { status, body } = runFilter(
      new ConflictException({ code: 'SLOT_OVERLAP', message: 'Slots overlap' }),
    );
    expect(status).toBe(HttpStatus.CONFLICT);
    expect(body).toEqual({
      success: false,
      error: { code: 'SLOT_OVERLAP', message: 'Slots overlap' },
    });
    expect(body.error.details).toBeUndefined();
  });

  it('maps a class-validator failure to VALIDATION_ERROR with details', () => {
    const { status, body } = runFilter(
      new BadRequestException({
        message: ['name should not be empty', 'pincode must be valid'],
        error: 'Bad Request',
        statusCode: 400,
      }),
    );
    expect(status).toBe(HttpStatus.BAD_REQUEST);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toBe('Validation failed');
    expect(body.error.details).toEqual(['name should not be empty', 'pincode must be valid']);
  });

  it('derives a stable code from status for a code-less string exception', () => {
    const { status, body } = runFilter(new NotFoundException('Tenant not found'));
    expect(status).toBe(HttpStatus.NOT_FOUND);
    expect(body).toEqual({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Tenant not found' },
    });
  });

  it('maps each supported status to its stable code', () => {
    expect(runFilter(new UnauthorizedException('nope')).body.error.code).toBe('UNAUTHORIZED');
    expect(runFilter(new ForbiddenException('nope')).body.error.code).toBe('FORBIDDEN');
    expect(runFilter(new ConflictException('nope')).body.error.code).toBe('CONFLICT');
    expect(
      runFilter(new HttpException('Too many', HttpStatus.TOO_MANY_REQUESTS)).body.error.code,
    ).toBe('RATE_LIMIT_EXCEEDED');
    expect(runFilter(new BadRequestException('bad')).body.error.code).toBe('BAD_REQUEST');
  });

  it('never leaks the message of a 5xx HttpException', () => {
    const { status, body } = runFilter(
      new HttpException('sensitive internal detail', HttpStatus.INTERNAL_SERVER_ERROR),
    );
    expect(status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(body).toEqual({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
    expect(JSON.stringify(body)).not.toContain('sensitive internal detail');
  });

  it('maps an unexpected non-HTTP error to a generic 500 (no leak)', () => {
    const { status, body } = runFilter(new Error('raw stack / db detail'));
    expect(status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(body).toEqual({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
    expect(JSON.stringify(body)).not.toContain('raw stack');
  });
});

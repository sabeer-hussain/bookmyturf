import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaExceptionFilter } from './prisma-exception.filter';

function makePrismaError(code: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('db error detail', {
    code,
    clientVersion: 'test',
  });
}

function runFilter(exception: Prisma.PrismaClientKnownRequestError): {
  status: number;
  body: any;
} {
  const filter = new PrismaExceptionFilter();
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
      getRequest: () => ({ method: 'POST', url: '/v1/test' }),
    }),
  } as unknown as ArgumentsHost;

  filter.catch(exception, host);
  return { status: capturedStatus, body: capturedBody };
}

describe('PrismaExceptionFilter', () => {
  it('maps P2002 (unique constraint) to 409 CONFLICT with a generic message', () => {
    const { status, body } = runFilter(makePrismaError('P2002'));
    expect(status).toBe(HttpStatus.CONFLICT);
    expect(body.error.code).toBe('CONFLICT');
    expect(JSON.stringify(body)).not.toContain('db error detail');
  });

  it('maps P2025 (record not found) to 404 NOT_FOUND', () => {
    const { status, body } = runFilter(makePrismaError('P2025'));
    expect(status).toBe(HttpStatus.NOT_FOUND);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('maps P2003 (FK constraint) to 400 BAD_REQUEST', () => {
    const { status, body } = runFilter(makePrismaError('P2003'));
    expect(status).toBe(HttpStatus.BAD_REQUEST);
    expect(body.error.code).toBe('BAD_REQUEST');
  });

  it('maps an unknown Prisma code to a generic 500 (no leak)', () => {
    const { status, body } = runFilter(makePrismaError('P2099'));
    expect(status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(body).toEqual({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
    expect(JSON.stringify(body)).not.toContain('db error detail');
  });
});

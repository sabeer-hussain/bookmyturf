import { describe, it, expect } from 'vitest';
import {
  getErrorCode,
  getErrorDetails,
  getErrorMessage,
  resolveApiErrorMessage,
} from '@/lib/api-error';

/** Build an axios-style error carrying the API error envelope. */
const apiError = (code?: string, message?: string, details?: string[]) => ({
  response: { data: { success: false, error: { code, message, details } } },
});

describe('api-error helpers', () => {
  it('reads code and message from the envelope', () => {
    const err = apiError('SLOT_OVERLAP', 'Slots overlap');
    expect(getErrorCode(err)).toBe('SLOT_OVERLAP');
    expect(getErrorMessage(err)).toBe('Slots overlap');
  });

  it('returns undefined for a non-envelope / network error', () => {
    expect(getErrorCode(new Error('network'))).toBeUndefined();
    expect(getErrorMessage(undefined)).toBeUndefined();
  });

  it('maps VENUE_LIMIT_REACHED to friendly copy', () => {
    expect(resolveApiErrorMessage(apiError('VENUE_LIMIT_REACHED', 'raw'), 'fallback')).toBe(
      'Venue limit reached. Please upgrade your plan.',
    );
  });

  it('maps COURT_LIMIT_REACHED to friendly copy', () => {
    expect(resolveApiErrorMessage(apiError('COURT_LIMIT_REACHED', 'raw'), 'fallback')).toBe(
      'Court limit reached. Please upgrade your plan.',
    );
  });

  it('maps SUBSCRIPTION_INACTIVE to friendly copy', () => {
    expect(resolveApiErrorMessage(apiError('SUBSCRIPTION_INACTIVE', 'raw'), 'fallback')).toBe(
      'Your subscription is inactive. Please renew.',
    );
  });

  it('falls back to the envelope message for a VALIDATION_ERROR with no details', () => {
    expect(
      resolveApiErrorMessage(apiError('VALIDATION_ERROR', 'Validation failed'), 'fallback'),
    ).toBe('Validation failed');
  });

  it('surfaces the specific field messages for a VALIDATION_ERROR (deduped, inline)', () => {
    const err = apiError('VALIDATION_ERROR', 'Validation failed', [
      'Pincode must be a 6-digit number',
      'pincode should not be empty',
      'pincode must be a string',
    ]);
    const msg = resolveApiErrorMessage(err, 'fallback');
    expect(msg).toContain('Pincode must be a 6-digit number');
    expect(msg).toContain('pincode should not be empty');
    expect(msg).toContain('; ');
  });

  it('getErrorDetails returns the details array, or undefined', () => {
    expect(getErrorDetails(apiError('VALIDATION_ERROR', 'x', ['a', 'b']))).toEqual(['a', 'b']);
    expect(getErrorDetails(apiError('NOT_FOUND', 'x'))).toBeUndefined();
    expect(getErrorDetails(new Error('network'))).toBeUndefined();
  });

  it('falls back to the default when there is no envelope message', () => {
    expect(resolveApiErrorMessage(new Error('network'), 'Failed to create venue')).toBe(
      'Failed to create venue',
    );
  });
});

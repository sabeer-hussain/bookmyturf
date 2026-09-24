/**
 * Helpers for reading the API error envelope `{ success:false, error:{ code, message, details? } }`
 * on the frontend. Centralizes envelope parsing so components don't reach into the response shape
 * directly (and so a change to the envelope is handled in one place).
 */

/** The error `code` from the API envelope, if present. */
export function getErrorCode(err: unknown): string | undefined {
  return (err as any)?.response?.data?.error?.code;
}

/** The human-readable `message` from the API envelope, if present. */
export function getErrorMessage(err: unknown): string | undefined {
  return (err as any)?.response?.data?.error?.message;
}

/** The field-level validation messages from the API envelope, if present. */
export function getErrorDetails(err: unknown): string[] | undefined {
  const details = (err as any)?.response?.data?.error?.details;
  return Array.isArray(details) ? details : undefined;
}

/**
 * Resolve the user-facing message for an API error.
 * Maps a set of known business codes to friendly copy; for validation errors, surfaces the
 * specific field messages so the user knows what to fix; otherwise falls back to the envelope
 * message, then to the provided default.
 */
export function resolveApiErrorMessage(err: unknown, fallback: string): string {
  const code = getErrorCode(err);
  switch (code) {
    case 'VENUE_LIMIT_REACHED':
      return 'Venue limit reached. Please upgrade your plan.';
    case 'COURT_LIMIT_REACHED':
      return 'Court limit reached. Please upgrade your plan.';
    case 'SUBSCRIPTION_INACTIVE':
      return 'Your subscription is inactive. Please renew.';
    case 'VALIDATION_ERROR': {
      const details = getErrorDetails(err);
      if (details && details.length > 0) {
        // Surface the specific field problems so the user knows what to fix.
        // Joined inline (the toast is single-line); de-duplicated for readability.
        return Array.from(new Set(details)).join('; ');
      }
      return getErrorMessage(err) || fallback;
    }
    default:
      return getErrorMessage(err) || fallback;
  }
}

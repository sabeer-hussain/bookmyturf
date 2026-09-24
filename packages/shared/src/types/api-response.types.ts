/** Pagination metadata returned alongside list responses. */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages?: number;
}

/** A successful API response. `success` discriminates the union. */
export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

/** The error envelope. All API errors are normalized to this shape. */
export interface ErrorResponse {
  success: false;
  error: {
    /** Stable, machine-readable code (e.g. `VALIDATION_ERROR`, `SLOT_OVERLAP`, `NOT_FOUND`). */
    code: string;
    /** Human-readable message. */
    message: string;
    /** Field-level messages — populated for validation errors, omitted otherwise. */
    details?: string[];
  };
}

/**
 * Every API response is either a {@link SuccessResponse} or an {@link ErrorResponse}.
 * `success` is the discriminant: `true` narrows to `data`, `false` narrows to `error`.
 */
export type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
}

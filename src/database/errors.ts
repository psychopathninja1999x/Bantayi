export class DatabaseError extends Error {
  readonly code?: string;

  constructor(
    message: string,
    options?: {
      cause?: unknown;
      code?: string;
    },
  ) {
    super(message);
    this.name = 'DatabaseError';
    if (options?.code !== undefined) {
      this.code = options.code;
    }
    if (options?.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

export function isDatabaseError(e: unknown): e is DatabaseError {
  return e instanceof DatabaseError;
}

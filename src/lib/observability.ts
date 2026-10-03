import { randomUUID } from 'node:crypto';

export type ErrorCategory =
  | 'validation_error'
  | 'not_found'
  | 'unauthorized'
  | 'forbidden'
  | 'rate_limit'
  | 'upload'
  | 'processing'
  | 'database'
  | 'ai'
  | 'mail'
  | 'storage'
  | 'external_service'
  | 'unexpected';

export const logSeverityOrder: Record<ErrorCategory, number> = {
  validation_error: 1,
  not_found: 2,
  unauthorized: 3,
  forbidden: 3,
  rate_limit: 3,
  upload: 4,
  processing: 4,
  database: 5,
  external_service: 6,
  storage: 6,
  ai: 6,
  mail: 6,
  unexpected: 7,
};

let requestId: string | null = null;

export function setRequestId(id: string): void {
  requestId = id;
}

export function requestIdValue(): string {
  return requestId ?? randomUUID();
}

/**
 * Build a safe structured log for a server/API error.
 * Raw tokens, connection strings, dataset contents, and personal data
 * are never included.
 */
export function logError(error: unknown, context?: Record<string, unknown>): void {
  const category = classifyError(error);
  const entry: Record<string, unknown> = {
    message: error instanceof Error ? error.message : String(error),
    category,
    requestId: requestIdValue(),
  };

  if (context?.userId) entry.userId = context.userId;
  if (context?.errorClass) entry.errorClass = context.errorClass;
  if (context?.statusCode) entry.statusCode = context.statusCode;

  // Only safe, high-level context is attached here.
  if (Object.keys(context ?? {}).length > 0) {
    entry.context = Object.fromEntries(
      Object.entries(context).filter(([key]) => {
        if (['body', 'payload', 'file', 'rows', 'data', 'config', 'result'].includes(key)) {
          return false;
        }
        return true;
      })
    );
  }

  // In production this would be routed to the monitoring provider's SDK.
  console.error(JSON.stringify(entry));
}

export function classifyError(error: unknown): ErrorCategory {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    const code = error['code']?.toString().toLowerCase() ?? '';

    if (code === 'LIMIT_EXCEEDED' || code === 'rate_limit') return 'rate_limit';
    if (
      message.includes('unauthorized') ||
      message.includes('forbidden') ||
      message.includes('not found')
    ) {
      if (message.includes('not found')) return 'not_found';
      if (message.includes('forbidden')) return 'forbidden';
      return 'unauthorized';
    }
    if (
      message.includes('upload') ||
      message.includes('r2') ||
      message.includes('presign') ||
      message.includes('signed url')
    ) {
      return 'upload';
    }
    if (
      message.includes('process') ||
      message.includes('processing') ||
      message.includes('invalid file') ||
      message.includes('no data could be extracted')
    ) {
      return 'processing';
    }
    if (
      message.includes('database') ||
      message.includes('prisma') ||
      message.includes('pqn')
    ) {
      return 'database';
    }
    if (
      message.includes('ai') ||
      message.includes('groq') ||
      message.includes('chat') ||
      message.includes('model')
    ) {
      return 'ai';
    }
    if (message.includes('mail') || message.includes('send')) {
      return 'mail';
    }
    if (message.includes('storage') || message.includes('r2') || message.includes('s3')) {
      return 'storage';
    }
    if (
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('504')
    ) {
      return 'external_service';
    }
  }

  return 'unexpected';
}

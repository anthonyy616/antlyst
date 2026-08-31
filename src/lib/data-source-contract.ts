/**
 * Unified Data Source Contract
 *
 * Every data source (upload, URL, API, Google Sheets, S3) should produce
 * a normalized dataset through a common pipeline:
 *
 * Data Source → Fetch → Validate → Parse → Normalize → Dataset
 */

// ── Error Codes ────────────────────────────────────────────────────────

export const DataSourceErrorCode = {
    INVALID_URL: 'INVALID_URL',
    INVALID_FORMAT: 'INVALID_FORMAT',
    EMPTY_DATASET: 'EMPTY_DATASET',
    PARSING_ERROR: 'PARSING_ERROR',
    NETWORK_ERROR: 'NETWORK_ERROR',
    TIMEOUT: 'TIMEOUT',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    SOURCE_NOT_FOUND: 'SOURCE_NOT_FOUND',
    FILE_TOO_LARGE: 'FILE_TOO_LARGE',
    DATASET_TOO_LARGE: 'DATASET_TOO_LARGE',
    UNSUPPORTED_CONTENT_TYPE: 'UNSUPPORTED_CONTENT_TYPE',
    INTERNAL_URL_BLOCKED: 'INTERNAL_URL_BLOCKED',
    REDIRECT_LIMIT_EXCEEDED: 'REDIRECT_LIMIT_EXCEEDED',
    INVALID_RESPONSE: 'INVALID_RESPONSE',
    EMPTY_RESPONSE: 'EMPTY_RESPONSE',
    S3_ACCESS_DENIED: 'S3_ACCESS_DENIED',
    S3_OBJECT_NOT_FOUND: 'S3_OBJECT_NOT_FOUND',
    GOOGLE_SHEETS_NOT_FOUND: 'GOOGLE_SHEETS_NOT_FOUND',
    GOOGLE_SHEETS_PRIVATE: 'GOOGLE_SHEETS_PRIVATE',
    API_RETURNED_ERROR: 'API_RETURNED_ERROR',
    UNKNOWN_SOURCE_TYPE: 'UNKNOWN_SOURCE_TYPE',
} as const;

export type DataSourceErrorCode =
    (typeof DataSourceErrorCode)[keyof typeof DataSourceErrorCode];

// ── Source Types ───────────────────────────────────────────────────────

export type DataSourceType =
    | 'upload'
    | 'url'
    | 'api'
    | 'google-sheets'
    | 's3';

export type DataSourceStatus =
    | 'pending'
    | 'fetching'
    | 'processing'
    | 'ready'
    | 'error';

// ── Configuration ──────────────────────────────────────────────────────

export interface DataSourceConfig {
    url?: string;
    headers?: Record<string, string>;
    method?: 'GET' | 'POST';
    body?: string;
    sheetName?: string;
    s3Bucket?: string;
    s3Key?: string;
    s3Region?: string;
    s3AccessKeyId?: string;
    s3SecretAccessKey?: string;
}

// ── Error Result ───────────────────────────────────────────────────────

export interface DataSourceError {
    code: DataSourceErrorCode;
    message: string;
    sourceType: DataSourceType | 'unknown';
    details?: Record<string, unknown>;
    timestamp: string;
}

// ── Fetch Result (Normalized) ──────────────────────────────────────────

export interface DataSourceResult {
    success: boolean;
    /** Normalized rows (always array of objects) */
    data?: any[];
    /** Raw buffer for storage (CSV preferred) */
    rawBuffer?: Buffer;
    /** MIME type of stored data */
    mimeType?: string;
    /** Suggested filename */
    fileName?: string;
    /** Dataset metadata */
    metadata?: DataSourceMetadata;
    /** Error information if failed */
    error?: DataSourceError;
}

// ── Dataset Metadata ───────────────────────────────────────────────────

export interface DataSourceMetadata {
    rowCount: number;
    columnCount: number;
    sourceType: DataSourceType | 'unknown';
    /** Original content type from response */
    contentType?: string;
    /** Raw response size in bytes */
    responseSize?: number;
    /** Whether sampling was used for large datasets */
    sampled?: boolean;
}

// ── Validation Limits ──────────────────────────────────────────────────

export const DATA_SOURCE_LIMITS = {
    /** Max file/download size in bytes (50MB) */
    MAX_RESPONSE_SIZE: 50 * 1024 * 1024,
    /** Max rows to return (1M) */
    MAX_ROWS: 1_000_000,
    /** Request timeout in milliseconds (30s) */
    REQUEST_TIMEOUT_MS: 30_000,
    /** Test connection timeout (10s) */
    TEST_TIMEOUT_MS: 10_000,
    /** Max redirect count */
    MAX_REDIRECTS: 5,
    /** Max API key header length */
    MAX_HEADER_VALUE_LENGTH: 1024,
} as const;

// ── Helper: Create Standardized Error ──────────────────────────────────

export function createDataSourceError(
    code: DataSourceErrorCode,
    message: string,
    sourceType: DataSourceType | 'unknown' = 'unknown',
    details?: Record<string, unknown>
): DataSourceError {
    return {
        code,
        message,
        sourceType,
        details,
        timestamp: new Date().toISOString(),
    };
}

// ── Helper: Create Success Result ──────────────────────────────────────

export function createSuccessResult(
    data: any[],
    rawBuffer: Buffer,
    mimeType: string,
    fileName: string,
    metadata: Omit<DataSourceMetadata, 'rowCount' | 'columnCount'>
): DataSourceResult {
    return {
        success: true,
        data,
        rawBuffer,
        mimeType,
        fileName,
        metadata: {
            rowCount: data.length,
            columnCount: data.length > 0 ? Object.keys(data[0]).length : 0,
            ...metadata,
        },
    };
}

// ── Helper: Create Error Result ────────────────────────────────────────

export function createErrorResult(
    code: DataSourceErrorCode,
    message: string,
    sourceType: DataSourceType | 'unknown' = 'unknown',
    details?: Record<string, unknown>
): DataSourceResult {
    return {
        success: false,
        error: createDataSourceError(code, message, sourceType, details),
    };
}

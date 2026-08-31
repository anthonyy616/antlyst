import { describe, it, expect } from 'vitest';
import {
    createDataSourceError,
    createSuccessResult,
    createErrorResult,
    DataSourceErrorCode,
    DATA_SOURCE_LIMITS,
} from '../lib/data-source-contract';

describe('DataSourceContract', () => {
    describe('createDataSourceError', () => {
        it('should create error with all required fields', () => {
            const error = createDataSourceError(
                'INVALID_URL',
                'Bad URL',
                'url'
            );
            expect(error.code).toBe('INVALID_URL');
            expect(error.message).toBe('Bad URL');
            expect(error.sourceType).toBe('url');
            expect(error.timestamp).toBeDefined();
            expect(new Date(error.timestamp).getTime()).not.toBeNaN();
        });

        it('should include optional details', () => {
            const error = createDataSourceError(
                'NETWORK_ERROR',
                'Failed',
                'api',
                { statusCode: 503 }
            );
            expect(error.details).toEqual({ statusCode: 503 });
        });

        it('should default sourceType to unknown', () => {
            const error = createDataSourceError('TIMEOUT', 'Timed out');
            expect(error.sourceType).toBe('unknown');
        });
    });

    describe('createSuccessResult', () => {
        it('should create success result with metadata', () => {
            const data = [
                { name: 'Alice', age: 30 },
                { name: 'Bob', age: 25 },
            ];
            const buffer = Buffer.from('name,age\nAlice,30\nBob,25');
            const result = createSuccessResult(
                data,
                buffer,
                'text/csv',
                'test.csv',
                { sourceType: 'url' }
            );
            expect(result.success).toBe(true);
            expect(result.data).toBe(data);
            expect(result.rawBuffer).toBe(buffer);
            expect(result.mimeType).toBe('text/csv');
            expect(result.fileName).toBe('test.csv');
            expect(result.metadata?.rowCount).toBe(2);
            expect(result.metadata?.columnCount).toBe(2);
            expect(result.metadata?.sourceType).toBe('url');
        });

        it('should handle empty data', () => {
            const result = createSuccessResult(
                [],
                Buffer.from(''),
                'text/csv',
                'empty.csv',
                { sourceType: 'upload' }
            );
            expect(result.metadata?.rowCount).toBe(0);
            expect(result.metadata?.columnCount).toBe(0);
        });
    });

    describe('createErrorResult', () => {
        it('should create error result with error object', () => {
            const result = createErrorResult(
                'EMPTY_DATASET',
                'No data',
                'google-sheets'
            );
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.code).toBe('EMPTY_DATASET');
            expect(result.error?.message).toBe('No data');
            expect(result.error?.sourceType).toBe('google-sheets');
        });

        it('should not have data fields', () => {
            const result = createErrorResult('TIMEOUT', 'Request timed out');
            expect(result.data).toBeUndefined();
            expect(result.rawBuffer).toBeUndefined();
        });
    });

    describe('DATA_SOURCE_LIMITS', () => {
        it('should have reasonable limits', () => {
            expect(DATA_SOURCE_LIMITS.MAX_RESPONSE_SIZE).toBe(50 * 1024 * 1024); // 50MB
            expect(DATA_SOURCE_LIMITS.MAX_ROWS).toBe(1_000_000);
            expect(DATA_SOURCE_LIMITS.REQUEST_TIMEOUT_MS).toBe(30_000);
            expect(DATA_SOURCE_LIMITS.TEST_TIMEOUT_MS).toBe(10_000);
            expect(DATA_SOURCE_LIMITS.MAX_REDIRECTS).toBe(5);
            expect(DATA_SOURCE_LIMITS.MAX_HEADER_VALUE_LENGTH).toBe(1024);
        });
    });

    describe('Error codes', () => {
        it('should have all required error codes', () => {
            const requiredCodes = [
                'INVALID_URL',
                'INVALID_FORMAT',
                'EMPTY_DATASET',
                'PARSING_ERROR',
                'NETWORK_ERROR',
                'TIMEOUT',
                'UNAUTHORIZED',
                'FORBIDDEN',
                'SOURCE_NOT_FOUND',
                'FILE_TOO_LARGE',
                'DATASET_TOO_LARGE',
                'UNSUPPORTED_CONTENT_TYPE',
                'INTERNAL_URL_BLOCKED',
                'REDIRECT_LIMIT_EXCEEDED',
                'INVALID_RESPONSE',
                'EMPTY_RESPONSE',
                'S3_ACCESS_DENIED',
                'S3_OBJECT_NOT_FOUND',
                'GOOGLE_SHEETS_NOT_FOUND',
                'GOOGLE_SHEETS_PRIVATE',
                'API_RETURNED_ERROR',
                'UNKNOWN_SOURCE_TYPE',
            ];
            for (const code of requiredCodes) {
                expect(DataSourceErrorCode).toHaveProperty(code);
            }
        });
    });
});

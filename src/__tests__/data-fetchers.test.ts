import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchFromUrl, fetchFromAPI, fetchFromGoogleSheets, testDataSource } from '../lib/data-fetchers';

describe('Data Fetchers', () => {
    describe('fetchFromUrl', () => {
        it('should reject invalid URLs', async () => {
            const result = await fetchFromUrl('not-a-url');
            expect(result.success).toBe(false);
            expect(result.error?.code).toBe('INVALID_URL');
        });

        it('should reject internal URLs', async () => {
            const result = await fetchFromUrl('http://localhost:3000/api');
            expect(result.success).toBe(false);
            expect(result.error?.code).toBe('INVALID_URL');
        });

        it('should reject private IP URLs', async () => {
            const result = await fetchFromUrl('http://192.168.1.1/data.csv');
            expect(result.success).toBe(false);
            expect(result.error?.code).toBe('INVALID_URL');
        });

        it('should reject ftp protocol', async () => {
            const result = await fetchFromUrl('ftp://example.com/file.csv');
            expect(result.success).toBe(false);
            expect(result.error?.code).toBe('INVALID_URL');
        });

        it('should handle network errors gracefully', async () => {
            const result = await fetchFromUrl('https://nonexistent-domain-12345.example.com/data.csv');
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('should handle 404 responses', async () => {
            const result = await fetchFromUrl('https://httpbin.org/status/404');
            expect(result.success).toBe(false);
            expect(result.error?.code).toBe('SOURCE_NOT_FOUND');
        });
    });

    describe('fetchFromAPI', () => {
        it('should require URL', async () => {
            const result = await fetchFromAPI({});
            expect(result.success).toBe(false);
            expect(result.error?.code).toBe('INVALID_URL');
        });

        it('should reject internal URLs', async () => {
            const result = await fetchFromAPI({ url: 'http://127.0.0.1/api' });
            expect(result.success).toBe(false);
            expect(result.error?.code).toBe('INVALID_URL');
        });

        it('should reject invalid URLs', async () => {
            const result = await fetchFromAPI({ url: 'not-a-url' });
            expect(result.success).toBe(false);
            expect(result.error?.code).toBe('INVALID_URL');
        });
    });

    describe('fetchFromGoogleSheets', () => {
        it('should reject invalid Google Sheets URLs', async () => {
            const result = await fetchFromGoogleSheets('https://example.com/not-sheets');
            expect(result.success).toBe(false);
            expect(result.error?.code).toBe('INVALID_URL');
            expect(result.error?.message).toContain('Google Sheets URL');
        });

        it('should reject malformed Sheets URLs', async () => {
            const result = await fetchFromGoogleSheets('not-a-url');
            expect(result.success).toBe(false);
            expect(result.error?.code).toBe('INVALID_URL');
        });
    });

    describe('testDataSource', () => {
        it('should require URL for url type', async () => {
            const result = await testDataSource('url', {});
            expect(result.reachable).toBe(false);
            expect(result.error).toBe('URL is required');
        });

        it('should reject internal URLs', async () => {
            const result = await testDataSource('url', { url: 'http://10.0.0.1/' });
            expect(result.reachable).toBe(false);
        });

        it('should require URL for api type', async () => {
            const result = await testDataSource('api', {});
            expect(result.reachable).toBe(false);
            expect(result.error).toBe('URL is required');
        });

        it('should reject unknown types', async () => {
            const result = await testDataSource('unknown', {});
            expect(result.reachable).toBe(false);
            expect(result.error).toContain('Unknown source type');
        });

        it('should handle Google Sheets with invalid URL', async () => {
            const result = await testDataSource('google-sheets', { url: 'https://example.com' });
            expect(result.reachable).toBe(false);
            expect(result.error).toContain('Invalid');
        });

        it('should handle S3 with invalid URL', async () => {
            const result = await testDataSource('s3', { url: 'https://example.com/file.csv' });
            expect(result.reachable).toBe(false);
            expect(result.error).toContain('Invalid S3 URL');
        });

        it('should accept valid S3 URL format', async () => {
            const result = await testDataSource('s3', { url: 's3://my-bucket/data.csv' });
            expect(result.reachable).toBe(true);
        });
    });

    describe('Error handling edge cases', () => {
        it('should handle empty config gracefully', async () => {
            const result = await fetchFromAPI({ url: '' });
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('should handle malformed headers in API config', async () => {
            const result = await testDataSource('api', {
                url: 'https://httpbin.org/get',
                headers: 'not-json',
            });
            // Should not crash, just parse as empty headers
            expect(typeof result.reachable).toBe('boolean');
        });
    });
});

import { describe, it, expect } from 'vitest';
import { validateUrl, validateRedirectUrl, sanitizeHeaders } from '../lib/url-security';

describe('URL Security', () => {
    describe('validateUrl', () => {
        // Valid URLs
        it('should accept valid HTTPS URLs', () => {
            const result = validateUrl('https://example.com/data.csv');
            expect(result.valid).toBe(true);
            expect(result.parsedUrl).toBeDefined();
        });

        it('should accept valid HTTP URLs', () => {
            const result = validateUrl('http://example.com/data.csv');
            expect(result.valid).toBe(true);
        });

        it('should accept URLs with ports', () => {
            const result = validateUrl('https://example.com:8080/api/data');
            expect(result.valid).toBe(true);
        });

        it('should accept URLs with query parameters', () => {
            const result = validateUrl('https://example.com/api?key=value&format=csv');
            expect(result.valid).toBe(true);
        });

        // Invalid URLs
        it('should reject invalid URL format', () => {
            const result = validateUrl('not-a-url');
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Invalid URL format');
        });

        it('should reject FTP protocol', () => {
            const result = validateUrl('ftp://example.com/file.csv');
            expect(result.valid).toBe(false);
            expect(result.error).toContain('HTTP and HTTPS');
        });

        it('should reject file protocol', () => {
            const result = validateUrl('file:///etc/passwd');
            expect(result.valid).toBe(false);
        });

        it('should reject javascript protocol', () => {
            const result = validateUrl('javascript:alert(1)');
            expect(result.valid).toBe(false);
        });

        // SSRF protection - localhost
        it('should block localhost', () => {
            expect(validateUrl('http://localhost/api').valid).toBe(false);
            expect(validateUrl('http://localhost:3000/api').valid).toBe(false);
            expect(validateUrl('http://localhost.localdomain/').valid).toBe(false);
        });

        it('should block 127.0.0.1', () => {
            expect(validateUrl('http://127.0.0.1/').valid).toBe(false);
            expect(validateUrl('http://127.0.0.1:8080/').valid).toBe(false);
        });

        it('should block ::1 IPv6 loopback', () => {
            expect(validateUrl('http://[::1]/').valid).toBe(false);
        });

        // SSRF protection - private IPs
        it('should block 10.x.x.x range', () => {
            expect(validateUrl('http://10.0.0.1/').valid).toBe(false);
            expect(validateUrl('http://10.255.255.255/').valid).toBe(false);
            expect(validateUrl('http://10.1.2.3:8080/').valid).toBe(false);
        });

        it('should block 172.16-31.x.x range', () => {
            expect(validateUrl('http://172.16.0.1/').valid).toBe(false);
            expect(validateUrl('http://172.31.255.255/').valid).toBe(false);
            expect(validateUrl('http://172.20.10.1/').valid).toBe(false);
        });

        it('should block 192.168.x.x range', () => {
            expect(validateUrl('http://192.168.1.1/').valid).toBe(false);
            expect(validateUrl('http://192.168.0.1:3000/').valid).toBe(false);
        });

        it('should block 169.254.x.x (link-local)', () => {
            expect(validateUrl('http://169.254.169.254/').valid).toBe(false);
        });

        it('should block cloud metadata endpoints', () => {
            expect(validateUrl('http://169.254.169.254/latest/meta-data/').valid).toBe(false);
            expect(validateUrl('http://metadata.google.internal/').valid).toBe(false);
        });

        it('should block 0.0.0.0', () => {
            expect(validateUrl('http://0.0.0.0/').valid).toBe(false);
        });

        it('should block 255.255.255.255', () => {
            expect(validateUrl('http://255.255.255.255/').valid).toBe(false);
        });

        // SSRF protection - blocked hostnames
        it('should block .local domains', () => {
            expect(validateUrl('http://myserver.local/').valid).toBe(false);
        });

        it('should block .internal domains', () => {
            expect(validateUrl('http://service.internal/').valid).toBe(false);
        });

        it('should block .corp domains', () => {
            expect(validateUrl('http://app.corp/').valid).toBe(false);
        });

        it('should block .lan domains', () => {
            expect(validateUrl('http://nas.lan/').valid).toBe(false);
        });

        // Public IPs should be allowed
        it('should allow public IPs', () => {
            expect(validateUrl('http://8.8.8.8/').valid).toBe(true);
            expect(validateUrl('http://1.1.1.1/').valid).toBe(true);
        });
    });

    describe('validateRedirectUrl', () => {
        it('should validate redirect target', () => {
            const result = validateRedirectUrl(
                'https://example.com/new-location',
                'example.com'
            );
            expect(result.valid).toBe(true);
        });

        it('should block redirect to internal IP', () => {
            const result = validateRedirectUrl(
                'http://192.168.1.1/admin',
                'example.com'
            );
            expect(result.valid).toBe(false);
        });

        it('should block redirect to localhost', () => {
            const result = validateRedirectUrl(
                'http://localhost:3000/secret',
                'example.com'
            );
            expect(result.valid).toBe(false);
        });
    });

    describe('sanitizeHeaders', () => {
        it('should pass through normal headers', () => {
            const headers = {
                'Content-Type': 'application/json',
                'X-Custom-Header': 'value',
            };
            const result = sanitizeHeaders(headers);
            expect(result).toEqual(headers);
        });

        it('should strip x-forwarded headers', () => {
            const headers = {
                'X-Forwarded-For': '127.0.0.1',
                'X-Forwarded-Host': 'internal.corp',
                'Content-Type': 'application/json',
            };
            const result = sanitizeHeaders(headers);
            expect(result['X-Forwarded-For']).toBeUndefined();
            expect(result['X-Forwarded-Host']).toBeUndefined();
            expect(result['Content-Type']).toBe('application/json');
        });

        it('should strip x-real-ip', () => {
            const headers = {
                'X-Real-IP': '10.0.0.1',
            };
            const result = sanitizeHeaders(headers);
            expect(result['X-Real-IP']).toBeUndefined();
        });

        it('should strip host header', () => {
            const headers = {
                'Host': 'internal.server',
            };
            const result = sanitizeHeaders(headers);
            expect(result['Host']).toBeUndefined();
        });

        it('should truncate long header values', () => {
            const longValue = 'x'.repeat(2000);
            const headers = {
                'Authorization': longValue,
            };
            const result = sanitizeHeaders(headers);
            expect(result['Authorization'].length).toBeLessThanOrEqual(1024);
        });
    });
});

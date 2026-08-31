/**
 * URL Security Module
 *
 * Comprehensive SSRF protection for external data fetching.
 * Blocks access to internal networks, cloud metadata, and unsafe URLs.
 */

import { DATA_SOURCE_LIMITS } from './data-source-contract';

// ── IP Range Definitions ───────────────────────────────────────────────

const PRIVATE_IP_RANGES = [
    // IPv4 private ranges
    { start: [10, 0, 0, 0], end: [10, 255, 255, 255] },
    { start: [172, 16, 0, 0], end: [172, 31, 255, 255] },
    { start: [192, 168, 0, 0], end: [192, 168, 255, 255] },
    // Link-local
    { start: [169, 254, 0, 0], end: [169, 254, 255, 255] },
    // Loopback
    { start: [127, 0, 0, 0], end: [127, 255, 255, 255] },
    // Broadcast
    { start: [255, 255, 255, 255], end: [255, 255, 255, 255] },
    // Current network
    { start: [0, 0, 0, 0], end: [0, 0, 0, 0] },
    // Carrier-grade NAT
    { start: [100, 64, 0, 0], end: [100, 127, 255, 255] },
];

const BLOCKED_HOSTNAMES = new Set([
    'localhost',
    'metadata.google.internal',
    'instance-data.google.internal',
    '169.254.169.254',
    'metadata aws',
    'localhost.localdomain',
]);

const BLOCKED_HOSTNAME_SUFFIXES = [
    '.local',
    '.internal',
    '.corp',
    '.lan',
    '.home.arpa',
];

// ── IP Parsing ─────────────────────────────────────────────────────────

function parseIPv4(ip: string): number[] | null {
    const parts = ip.split('.');
    if (parts.length !== 4) return null;
    const nums = parts.map(Number);
    if (nums.some(n => isNaN(n) || n < 0 || n > 255 || !Number.isInteger(n))) return null;
    return nums;
}

function ipToNumber(ip: number[]): number {
    return (ip[0] << 24) | (ip[1] << 16) | (ip[2] << 8) | ip[3];
}

function isInRange(ip: number[], range: { start: number[]; end: number[] }): boolean {
    const ipNum = ipToNumber(ip);
    return ipNum >= ipToNumber(range.start) && ipNum <= ipToNumber(range.end);
}

function isPrivateIP(ip: string): boolean {
    const parsed = parseIPv4(ip);
    if (!parsed) return false;
    return PRIVATE_IP_RANGES.some(range => isInRange(parsed, range));
}

// ── Hostname Validation ────────────────────────────────────────────────

function isBlockedHostname(hostname: string): boolean {
    const lower = hostname.toLowerCase();

    // Exact match
    if (BLOCKED_HOSTNAMES.has(lower)) return true;

    // Suffix match
    if (BLOCKED_HOSTNAME_SUFFIXES.some(suffix => lower.endsWith(suffix))) return true;

    // IPv6 loopback
    if (lower === '::1' || lower === '[::1]') return true;

    // IPv4-mapped IPv6
    if (lower.startsWith('::ffff:')) {
        const ip = lower.slice(7);
        if (isPrivateIP(ip)) return true;
    }

    return false;
}

// ── URL Validation ─────────────────────────────────────────────────────

export interface URLValidationResult {
    valid: boolean;
    error?: string;
    parsedUrl?: URL;
}

/**
 * Validate a URL before fetching.
 * Checks protocol, hostname, and blocks internal/unsafe addresses.
 */
export function validateUrl(url: string): URLValidationResult {
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        return { valid: false, error: 'Invalid URL format' };
    }

    // Protocol check
    if (!['http:', 'https:'].includes(parsed.protocol)) {
        return { valid: false, error: 'Only HTTP and HTTPS protocols are allowed' };
    }

    // Hostname checks
    if (isBlockedHostname(parsed.hostname)) {
        return { valid: false, error: 'Internal URLs are not allowed' };
    }

    // Check if hostname is an IP address
    const ipMatch = parsed.hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (ipMatch) {
        const ip = [parseInt(ipMatch[1]), parseInt(ipMatch[2]), parseInt(ipMatch[3]), parseInt(ipMatch[4])];
        if (ip.some(n => n < 0 || n > 255)) {
            return { valid: false, error: 'Invalid IP address' };
        }
        if (isPrivateIP(parsed.hostname)) {
            return { valid: false, error: 'Private IP addresses are not allowed' };
        }
    }

    return { valid: true, parsedUrl: parsed };
}

/**
 * Validate a redirect URL.
 * Re-validates after redirect to prevent following redirects to internal IPs.
 */
export function validateRedirectUrl(
    url: string,
    originalHost: string
): URLValidationResult {
    const result = validateUrl(url);
    if (!result.valid) return result;

    // Additional check: if redirected to a different host, warn
    if (result.parsedUrl && result.parsedUrl.hostname !== originalHost) {
        // Still valid, but caller should be aware of cross-origin redirect
    }

    return result;
}

// ── Secure Fetch Wrapper ───────────────────────────────────────────────

export interface SecureFetchOptions {
    /** Max redirects to follow (default: 5) */
    maxRedirects?: number;
    /** Request timeout in ms (default: 30000) */
    timeoutMs?: number;
    /** Max response size in bytes (default: 50MB) */
    maxResponseSize?: number;
    /** Allowed content types (subset of response Content-Type) */
    allowedContentTypes?: string[];
    /** Custom headers */
    headers?: Record<string, string>;
    /** HTTP method */
    method?: 'GET' | 'POST' | 'HEAD';
    /** POST body */
    body?: string;
}

export interface SecureFetchResult {
    ok: boolean;
    response?: Response;
    buffer?: Buffer;
    error?: string;
    errorCode?: string;
    redirectedTo?: string;
}

/**
 * Secure fetch with SSRF protection, redirect limits, and size limits.
 */
export async function secureFetch(
    url: string,
    options: SecureFetchOptions = {}
): Promise<SecureFetchResult> {
    const {
        maxRedirects = DATA_SOURCE_LIMITS.MAX_REDIRECTS,
        timeoutMs = DATA_SOURCE_LIMITS.REQUEST_TIMEOUT_MS,
        maxResponseSize = DATA_SOURCE_LIMITS.MAX_RESPONSE_SIZE,
        allowedContentTypes,
        headers = {},
        method = 'GET',
        body,
    } = options;

    // Validate initial URL
    const validation = validateUrl(url);
    if (!validation.valid) {
        return { ok: false, error: validation.error, errorCode: 'INVALID_URL' };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    let redirectCount = 0;
    let currentUrl = url;
    let currentHost = validation.parsedUrl!.hostname;
    let lastResponse: Response | undefined;

    try {
        while (true) {
            const fetchOptions: RequestInit = {
                method: redirectCount > 0 ? 'GET' : method,
                headers: {
                    'User-Agent': 'Antlyst/1.0',
                    'Accept': 'application/json, text/csv, text/plain, */*',
                    ...headers,
                },
                signal: controller.signal,
                redirect: 'manual', // Handle redirects manually for validation
            };

            if (method === 'POST' && body && redirectCount === 0) {
                fetchOptions.body = body;
            }

            const response = await fetch(currentUrl, fetchOptions);

            // Handle redirects
            if ([301, 302, 303, 307, 308].includes(response.status)) {
                redirectCount++;
                if (redirectCount > maxRedirects) {
                    return {
                        ok: false,
                        error: `Too many redirects (max ${maxRedirects})`,
                        errorCode: 'REDIRECT_LIMIT_EXCEEDED',
                    };
                }

                const location = response.headers.get('location');
                if (!location) {
                    return {
                        ok: false,
                        error: 'Redirect without Location header',
                        errorCode: 'INVALID_RESPONSE',
                    };
                }

                // Resolve relative redirect URLs
                let redirectUrl: string;
                try {
                    redirectUrl = new URL(location, currentUrl).href;
                } catch {
                    return {
                        ok: false,
                        error: 'Invalid redirect URL',
                        errorCode: 'INVALID_URL',
                    };
                }

                // Validate redirect target
                const redirectValidation = validateRedirectUrl(redirectUrl, currentHost);
                if (!redirectValidation.valid) {
                    return {
                        ok: false,
                        error: `Blocked redirect to: ${redirectValidation.error}`,
                        errorCode: 'INTERNAL_URL_BLOCKED',
                    };
                }

                currentUrl = redirectUrl;
                currentHost = redirectValidation.parsedUrl!.hostname;
                continue;
            }

            lastResponse = response;
            break;
        }

        if (!lastResponse) {
            return { ok: false, error: 'No response received', errorCode: 'NETWORK_ERROR' };
        }

        // Check HTTP status
        if (!lastResponse.ok) {
            const status = lastResponse.status;
            if (status === 401) {
                return { ok: false, error: 'Unauthorized (401)', errorCode: 'UNAUTHORIZED' };
            }
            if (status === 403) {
                return { ok: false, error: 'Forbidden (403)', errorCode: 'FORBIDDEN' };
            }
            if (status === 404) {
                return { ok: false, error: 'Source not found (404)', errorCode: 'SOURCE_NOT_FOUND' };
            }
            if (status === 429) {
                return { ok: false, error: 'Rate limited (429)', errorCode: 'API_RETURNED_ERROR' };
            }
            if (status >= 500) {
                return {
                    ok: false,
                    error: `Server error (${status})`,
                    errorCode: 'API_RETURNED_ERROR',
                };
            }
            return {
                ok: false,
                error: `HTTP ${status}: ${lastResponse.statusText}`,
                errorCode: 'API_RETURNED_ERROR',
            };
        }

        // Content-Type validation
        const contentType = lastResponse.headers.get('content-type') || '';
        if (allowedContentTypes && allowedContentTypes.length > 0) {
            const isAllowed = allowedContentTypes.some(ct =>
                contentType.toLowerCase().includes(ct.toLowerCase())
            );
            if (!isAllowed) {
                return {
                    ok: false,
                    error: `Unsupported content type: ${contentType}`,
                    errorCode: 'UNSUPPORTED_CONTENT_TYPE',
                };
            }
        }

        // Check content length before downloading
        const contentLength = lastResponse.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > maxResponseSize) {
            return {
                ok: false,
                error: `Response too large (${contentLength} bytes, max ${maxResponseSize})`,
                errorCode: 'FILE_TOO_LARGE',
            };
        }

        // Read response with size limit enforcement
        const reader = lastResponse.body?.getReader();
        if (!reader) {
            return { ok: false, error: 'No response body', errorCode: 'EMPTY_RESPONSE' };
        }

        const chunks: Uint8Array[] = [];
        let totalSize = 0;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            totalSize += value.length;
            if (totalSize > maxResponseSize) {
                reader.cancel();
                return {
                    ok: false,
                    error: `Response too large (exceeded ${maxResponseSize} bytes during download)`,
                    errorCode: 'FILE_TOO_LARGE',
                };
            }

            chunks.push(value);
        }

        const buffer = Buffer.concat(chunks);

        if (buffer.length === 0) {
            return {
                ok: false,
                error: 'Empty response body',
                errorCode: 'EMPTY_RESPONSE',
            };
        }

        return {
            ok: true,
            response: lastResponse,
            buffer,
            redirectedTo: currentUrl !== url ? currentUrl : undefined,
        };
    } catch (error: any) {
        if (error.name === 'AbortError') {
            return {
                ok: false,
                error: `Request timed out (${timeoutMs}ms)`,
                errorCode: 'TIMEOUT',
            };
        }
        return {
            ok: false,
            error: error.message || 'Network error',
            errorCode: 'NETWORK_ERROR',
        };
    } finally {
        clearTimeout(timeout);
    }
}

// ── Header Security ────────────────────────────────────────────────────

/**
 * Sanitize API headers to prevent header injection and credential leakage.
 */
export function sanitizeHeaders(
    headers: Record<string, string>
): Record<string, string> {
    const sanitized: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
        // Skip dangerous headers
        const lowerKey = key.toLowerCase();
        if (
            lowerKey.startsWith('x-forwarded') ||
            lowerKey.startsWith('x-real-ip') ||
            lowerKey === 'host' ||
            lowerKey === 'authorization' && typeof value === 'string' && value.length > 1024
        ) {
            continue;
        }

        // Truncate long values
        if (typeof value === 'string' && value.length > DATA_SOURCE_LIMITS.MAX_HEADER_VALUE_LENGTH) {
            sanitized[key] = value.slice(0, DATA_SOURCE_LIMITS.MAX_HEADER_VALUE_LENGTH);
        } else {
            sanitized[key] = value;
        }
    }

    return sanitized;
}

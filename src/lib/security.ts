import DOMPurify from 'isomorphic-dompurify';

export function sanitizeInput(input: string): string {
    return DOMPurify.sanitize(input, {
        ALLOWED_TAGS: [], // Strip all HTML tags
        ALLOWED_ATTR: [],
    });
}

export function validateSafeUrl(url: string): boolean {
    try {
        const parsed = new URL(url);

        // Block non-http/https
        if (!['http:', 'https:'].includes(parsed.protocol)) return false;

        // Block localhost and private IP ranges (SSRF)
        const hostname = parsed.hostname;

        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return false;
        if (hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.16.')) return false;

        return true;
    } catch {
        return false;
    }
}

export function containsSqlInjection(input: string): boolean {
    // Basic heuristic for common SQLi patterns
    const patterns = [
        /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
        /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
        /w*((%27)|('))((%6F)|o|(%4F))((%72)|r|(%52))/i,
        /((%27)|('))union/i,
    ];

    for (const pattern of patterns) {
        if (pattern.test(input)) return true;
    }
    return false;
}

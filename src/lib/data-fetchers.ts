/**
 * Server-Side Data Fetchers
 * 
 * Retrieve data from various sources (URL, API, Google Sheets, S3)
 * and normalize into rows for the processing pipeline.
 */

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

// ── Types ──────────────────────────────────────────────────────────────

export interface FetchResult {
    success: boolean;
    data?: any[];
    rawBuffer?: Buffer;
    mimeType?: string;
    fileName?: string;
    error?: string;
    metadata?: {
        rowCount: number;
        columnCount: number;
        sourceType: string;
    };
}

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

// ── URL Validation Helpers ─────────────────────────────────────────────

function isValidPublicUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

function isInternalUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        const hostname = parsed.hostname;

        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return true;

        const ipMatch = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
        if (ipMatch) {
            const [, a, b] = ipMatch.map(Number);
            if (a === 10) return true;
            if (a === 172 && b >= 16 && b <= 31) return true;
            if (a === 192 && b === 168) return true;
            if (a === 169 && b === 254) return true;
        }

        if (hostname === '169.254.169.254') return true;

        return false;
    } catch {
        return true;
    }
}

function getExtension(url: string): string {
    try {
        const pathname = new URL(url).pathname;
        return pathname.split('.').pop()?.toLowerCase() || '';
    } catch {
        return '';
    }
}

function getFileNameFromUrl(url: string): string | null {
    try {
        const pathname = new URL(url).pathname;
        const parts = pathname.split('/');
        const lastPart = parts[parts.length - 1];
        if (lastPart && lastPart.includes('.')) {
            return decodeURIComponent(lastPart);
        }
        return null;
    } catch {
        return null;
    }
}

// ── Shared Parsers ─────────────────────────────────────────────────────

function parseCsvBuffer(buffer: Buffer): any[] {
    const csvString = buffer.toString('utf-8');
    const result = Papa.parse(csvString, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
    });
    return result.data as any[];
}

function normalizeJsonToRows(json: any): any[] {
    if (Array.isArray(json)) return json;
    if (json.data && Array.isArray(json.data)) return json.data;
    if (json.results && Array.isArray(json.results)) return json.results;
    if (json.items && Array.isArray(json.items)) return json.items;

    for (const key of Object.keys(json)) {
        if (Array.isArray(json[key]) && json[key].length > 0 && typeof json[key][0] === 'object') {
            return json[key];
        }
    }

    return [];
}

function normalizeApiResponse(json: any): any[] {
    if (Array.isArray(json)) return json;
    if (json.data && Array.isArray(json.data)) return json.data;
    if (json.results && Array.isArray(json.results)) return json.results;
    if (json.items && Array.isArray(json.items)) return json.items;
    if (json.records && Array.isArray(json.records)) return json.records;
    if (json.rows && Array.isArray(json.rows)) return json.rows;
    if (json.entries && Array.isArray(json.entries)) return json.entries;

    for (const key of Object.keys(json)) {
        if (Array.isArray(json[key]) && json[key].length > 0 && typeof json[key][0] === 'object') {
            return json[key];
        }
    }

    if (typeof json === 'object' && !Array.isArray(json)) {
        return [json];
    }

    return [];
}

function parseS3Url(url: string): { bucket: string; key: string; region?: string } | null {
    const s3ProtocolMatch = url.match(/^s3:\/\/([^/]+)\/(.+)$/);
    if (s3ProtocolMatch) {
        return { bucket: s3ProtocolMatch[1], key: s3ProtocolMatch[2] };
    }

    const httpsMatch = url.match(/^https:\/\/([^.]+)\.s3\.([^.]+)\.amazonaws\.com\/(.+)$/);
    if (httpsMatch) {
        return { bucket: httpsMatch[1], key: httpsMatch[3], region: httpsMatch[2] };
    }

    const pathStyleMatch = url.match(/^https:\/\/s3\.([^.]+)\.amazonaws\.com\/([^/]+)\/(.+)$/);
    if (pathStyleMatch) {
        return { bucket: pathStyleMatch[2], key: pathStyleMatch[3], region: pathStyleMatch[1] };
    }

    return null;
}

// ── 1. URL Fetcher ─────────────────────────────────────────────────────

export async function fetchFromUrl(url: string): Promise<FetchResult> {
    if (!isValidPublicUrl(url)) {
        return { success: false, error: 'Invalid URL format' };
    }
    if (isInternalUrl(url)) {
        return { success: false, error: 'Internal URLs are not allowed' };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: { 'User-Agent': 'Antlyst/1.0' },
        });
        clearTimeout(timeout);

        if (!response.ok) {
            return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
        }

        const contentLength = response.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > 50 * 1024 * 1024) {
            return { success: false, error: 'File too large (max 50MB)' };
        }

        const contentType = response.headers.get('content-type') || '';
        const buffer = Buffer.from(await response.arrayBuffer());
        const ext = getExtension(url);

        if (ext === 'csv' || contentType.includes('text/csv') || contentType.includes('text/plain')) {
            const rows = parseCsvBuffer(buffer);
            return {
                success: true,
                data: rows,
                rawBuffer: buffer,
                mimeType: 'text/csv',
                fileName: getFileNameFromUrl(url) || 'data.csv',
                metadata: { rowCount: rows.length, columnCount: rows[0] ? Object.keys(rows[0]).length : 0, sourceType: 'url' },
            };
        }

        if (ext === 'json' || contentType.includes('application/json')) {
            const json = JSON.parse(buffer.toString('utf-8'));
            const rows = normalizeJsonToRows(json);
            return {
                success: true,
                data: rows,
                rawBuffer: Buffer.from(Papa.unparse(rows)),
                mimeType: 'text/csv',
                fileName: getFileNameFromUrl(url)?.replace('.json', '.csv') || 'data.csv',
                metadata: { rowCount: rows.length, columnCount: rows[0] ? Object.keys(rows[0]).length : 0, sourceType: 'url' },
            };
        }

        if (ext === 'xlsx' || ext === 'xls') {
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(firstSheet);
            return {
                success: true,
                data: rows,
                rawBuffer: buffer,
                mimeType: contentType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                fileName: getFileNameFromUrl(url) || 'data.xlsx',
                metadata: { rowCount: rows.length, columnCount: rows[0] ? Object.keys(rows[0]).length : 0, sourceType: 'url' },
            };
        }

        return { success: false, error: 'Unsupported file format. Use CSV, JSON, or Excel.' };
    } catch (error: any) {
        clearTimeout(timeout);
        if (error.name === 'AbortError') {
            return { success: false, error: 'Request timed out (30s)' };
        }
        return { success: false, error: error.message || 'Failed to fetch URL' };
    }
}

// ── 2. REST API Fetcher ────────────────────────────────────────────────

export async function fetchFromAPI(config: DataSourceConfig): Promise<FetchResult> {
    const { url, headers = {}, method = 'GET', body } = config;

    if (!url) return { success: false, error: 'URL is required' };
    if (!isValidPublicUrl(url) || isInternalUrl(url)) {
        return { success: false, error: 'Invalid or internal URL' };
    }

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);

        const fetchOptions: RequestInit = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...headers,
            },
            signal: controller.signal,
        };

        if (method === 'POST' && body) {
            fetchOptions.body = body;
        }

        const response = await fetch(url, fetchOptions);
        clearTimeout(timeout);

        if (!response.ok) {
            return { success: false, error: `API returned ${response.status}` };
        }

        const json = await response.json();
        const rows = normalizeApiResponse(json);

        if (rows.length === 0) {
            return { success: false, error: 'API returned no data rows' };
        }

        const csv = Papa.unparse(rows);
        const buffer = Buffer.from(csv, 'utf-8');

        return {
            success: true,
            data: rows,
            rawBuffer: buffer,
            mimeType: 'text/csv',
            fileName: `api_data_${Date.now()}.csv`,
            metadata: {
                rowCount: rows.length,
                columnCount: rows[0] ? Object.keys(rows[0]).length : 0,
                sourceType: 'api',
            },
        };
    } catch (error: any) {
        if (error.name === 'AbortError') {
            return { success: false, error: 'API request timed out (30s)' };
        }
        return { success: false, error: error.message || 'Failed to fetch API' };
    }
}

// ── 3. Google Sheets Fetcher ───────────────────────────────────────────

export async function fetchFromGoogleSheets(sheetUrl: string): Promise<FetchResult> {
    const match = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
        return { success: false, error: 'Invalid Google Sheets URL' };
    }

    const spreadsheetId = match[1];
    const gidMatch = sheetUrl.match(/gid=(\d+)/);
    const gid = gidMatch ? gidMatch[1] : '0';

    const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(exportUrl, {
            signal: controller.signal,
            redirect: 'follow',
        });
        clearTimeout(timeout);

        if (!response.ok) {
            if (response.status === 404) {
                return { success: false, error: 'Sheet not found. Make sure it is publicly accessible.' };
            }
            return { success: false, error: `Google Sheets returned ${response.status}` };
        }

        const csvText = await response.text();
        const buffer = Buffer.from(csvText, 'utf-8');
        const rows = parseCsvBuffer(buffer);

        return {
            success: true,
            data: rows,
            rawBuffer: buffer,
            mimeType: 'text/csv',
            fileName: `sheets_${spreadsheetId}.csv`,
            metadata: {
                rowCount: rows.length,
                columnCount: rows[0] ? Object.keys(rows[0]).length : 0,
                sourceType: 'google-sheets',
            },
        };
    } catch (error: any) {
        if (error.name === 'AbortError') {
            return { success: false, error: 'Request timed out (30s)' };
        }
        return { success: false, error: error.message || 'Failed to fetch Google Sheet' };
    }
}

// ── 4. S3 Bucket Fetcher ───────────────────────────────────────────────

export async function fetchFromS3(
    s3Url: string,
    credentials?: { accessKeyId: string; secretAccessKey: string; region?: string }
): Promise<FetchResult> {
    const parsed = parseS3Url(s3Url);
    if (!parsed) {
        return { success: false, error: 'Invalid S3 URL format. Use s3://bucket/key or https://bucket.s3.region.amazonaws.com/key' };
    }

    const { bucket, key, region } = parsed;

    const s3Client = new S3Client({
        region: credentials?.region || region || 'us-east-1',
        ...(credentials && {
            credentials: {
                accessKeyId: credentials.accessKeyId,
                secretAccessKey: credentials.secretAccessKey,
            },
        }),
    });

    try {
        const command = new GetObjectCommand({ Bucket: bucket, Key: key });
        const response = await s3Client.send(command);

        if (!response.Body) {
            return { success: false, error: 'Empty response from S3' };
        }

        const chunks: any[] = [];
        const stream = response.Body as unknown as Readable;
        await new Promise<void>((resolve, reject) => {
            stream.on('data', (chunk: any) => chunks.push(chunk));
            stream.on('error', reject);
            stream.on('end', resolve);
        });

        const buffer = Buffer.concat(chunks);
        const contentType = response.ContentType || '';
        const fileName = key.split('/').pop() || 'data.csv';
        const ext = fileName.split('.').pop()?.toLowerCase() || 'csv';

        if (ext === 'csv' || ext === 'tsv') {
            const rows = parseCsvBuffer(buffer);
            return {
                success: true,
                data: rows,
                rawBuffer: buffer,
                mimeType: 'text/csv',
                fileName,
                metadata: { rowCount: rows.length, columnCount: rows[0] ? Object.keys(rows[0]).length : 0, sourceType: 's3' },
            };
        }

        if (ext === 'json') {
            const json = JSON.parse(buffer.toString('utf-8'));
            const rows = normalizeJsonToRows(json);
            return {
                success: true,
                data: rows,
                rawBuffer: Buffer.from(Papa.unparse(rows)),
                mimeType: 'text/csv',
                fileName: fileName.replace('.json', '.csv'),
                metadata: { rowCount: rows.length, columnCount: rows[0] ? Object.keys(rows[0]).length : 0, sourceType: 's3' },
            };
        }

        if (ext === 'xlsx' || ext === 'xls') {
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(firstSheet);
            return {
                success: true,
                data: rows,
                rawBuffer: buffer,
                mimeType: contentType,
                fileName,
                metadata: { rowCount: rows.length, columnCount: rows[0] ? Object.keys(rows[0]).length : 0, sourceType: 's3' },
            };
        }

        return { success: false, error: `Unsupported file type: .${ext}` };
    } catch (error: any) {
        if (error.name === 'NoSuchKey') {
            return { success: false, error: 'File not found in S3 bucket' };
        }
        if (error.name === 'AccessDenied') {
            return { success: false, error: 'Access denied. Check your AWS credentials and bucket permissions.' };
        }
        return { success: false, error: error.message || 'Failed to fetch from S3' };
    }
}

// ── 5. Test Connection ─────────────────────────────────────────────────

export async function testDataSource(
    type: string,
    config: Record<string, string>
): Promise<{
    reachable: boolean;
    samplePreview?: any[];
    columnCount?: number;
    error?: string;
    metadata?: { format: string; estimatedRows?: number };
}> {
    try {
        switch (type) {
            case 'url': {
                if (!config.url) return { reachable: false, error: 'URL is required' };
                const headResponse = await fetch(config.url, { method: 'HEAD', signal: AbortSignal.timeout(10000) });
                if (!headResponse.ok) {
                    return { reachable: false, error: `HTTP ${headResponse.status}` };
                }
                return {
                    reachable: true,
                    metadata: { format: headResponse.headers.get('content-type') || 'unknown' },
                };
            }

            case 'api': {
                if (!config.url) return { reachable: false, error: 'URL is required' };
                const headers = config.headers ? JSON.parse(config.headers) : {};
                const apiResponse = await fetch(config.url, {
                    headers,
                    signal: AbortSignal.timeout(10000),
                });
                if (!apiResponse.ok) {
                    return { reachable: false, error: `API returned ${apiResponse.status}` };
                }
                const apiJson = await apiResponse.json();
                const rows = normalizeApiResponse(apiJson);
                return {
                    reachable: true,
                    samplePreview: rows.slice(0, 5),
                    columnCount: rows[0] ? Object.keys(rows[0]).length : 0,
                    metadata: { format: 'json', estimatedRows: rows.length },
                };
            }

            case 'google-sheets': {
                if (!config.url) return { reachable: false, error: 'URL is required' };
                const match = config.url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
                if (!match) return { reachable: false, error: 'Invalid Sheets URL' };
                const testUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv&gid=0`;
                const sheetsResponse = await fetch(testUrl, { signal: AbortSignal.timeout(10000) });
                if (!sheetsResponse.ok) {
                    return { reachable: false, error: 'Sheet not accessible. Make sure it is shared publicly.' };
                }
                const csvText = await sheetsResponse.text();
                const parsed = Papa.parse(csvText, { header: true, dynamicTyping: true, skipEmptyLines: true });
                return {
                    reachable: true,
                    samplePreview: (parsed.data as any[]).slice(0, 5),
                    columnCount: parsed.meta.fields?.length || 0,
                    metadata: { format: 'csv', estimatedRows: parsed.data.length },
                };
            }

            case 's3': {
                if (!config.url) return { reachable: false, error: 'URL is required' };
                const parsed = parseS3Url(config.url);
                if (!parsed) return { reachable: false, error: 'Invalid S3 URL format' };
                return { reachable: true, metadata: { format: 's3' } };
            }

            default:
                return { reachable: false, error: `Unknown type: ${type}` };
        }
    } catch (error: any) {
        return { reachable: false, error: error.message };
    }
}

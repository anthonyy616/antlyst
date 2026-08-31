/**
 * Server-Side Data Fetchers
 *
 * Retrieve data from various sources (URL, API, Google Sheets, S3)
 * and normalize into rows for the processing pipeline.
 *
 * All fetchers follow the unified pipeline:
 *   Source → Validate → Fetch → Parse → Normalize → DataSourceResult
 */

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import {
    DataSourceConfig,
    DataSourceResult,
    DataSourceType,
    DATA_SOURCE_LIMITS,
    createSuccessResult,
    createErrorResult,
    DataSourceErrorCode,
} from './data-source-contract';
import { secureFetch, sanitizeHeaders, validateUrl } from './url-security';

// ── URL Helpers ────────────────────────────────────────────────────────

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

    if (result.errors.length > 0) {
        const criticalErrors = result.errors.filter(
            (e: any) => e.type === 'Quotes' || e.type === 'FieldMismatch'
        );
        if (criticalErrors.length > 0 && result.data.length === 0) {
            throw new Error(
                `CSV parsing failed: ${criticalErrors[0].message} (row ${criticalErrors[0].row})`
            );
        }
    }

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

// ── Enforce Row Limits ─────────────────────────────────────────────────

function enforceRowLimit(data: any[]): { data: any[]; sampled: boolean } {
    if (data.length <= DATA_SOURCE_LIMITS.MAX_ROWS) {
        return { data, sampled: false };
    }
    // Sample evenly from the dataset
    const step = Math.floor(data.length / DATA_SOURCE_LIMITS.MAX_ROWS);
    const sampled = data.filter((_, i) => i % step === 0).slice(0, DATA_SOURCE_LIMITS.MAX_ROWS);
    return { data: sampled, sampled: true };
}

// ── 1. URL Fetcher ─────────────────────────────────────────────────────

export async function fetchFromUrl(url: string): Promise<DataSourceResult> {
    // Validate URL first
    const urlValidation = validateUrl(url);
    if (!urlValidation.valid) {
        return createErrorResult('INVALID_URL', urlValidation.error!, 'url');
    }

    const ext = getExtension(url);
    const allowedTypes = ['text/csv', 'text/plain', 'application/json', 'text/json'];
    if (ext === 'xlsx' || ext === 'xls') {
        // Allow Excel content types
    }

    const fetchResult = await secureFetch(url, {
        timeoutMs: DATA_SOURCE_LIMITS.REQUEST_TIMEOUT_MS,
        maxResponseSize: DATA_SOURCE_LIMITS.MAX_RESPONSE_SIZE,
    });

    if (!fetchResult.ok) {
        return createErrorResult(
            fetchResult.errorCode as DataSourceErrorCode,
            fetchResult.error!,
            'url'
        );
    }

    const buffer = fetchResult.buffer!;
    const contentType = fetchResult.response?.headers.get('content-type') || '';
    const fileName = getFileNameFromUrl(url) || 'data.csv';

    try {
        // CSV
        if (ext === 'csv' || contentType.includes('text/csv') || contentType.includes('text/plain')) {
            const rows = parseCsvBuffer(buffer);
            if (rows.length === 0) {
                return createErrorResult('EMPTY_DATASET', 'The CSV file contains no data rows', 'url');
            }
            const { data, sampled } = enforceRowLimit(rows);
            return createSuccessResult(data, buffer, 'text/csv', fileName, {
                sourceType: 'url',
                contentType,
                responseSize: buffer.length,
                sampled,
            });
        }

        // JSON
        if (ext === 'json' || contentType.includes('application/json') || contentType.includes('text/json')) {
            let json: any;
            try {
                json = JSON.parse(buffer.toString('utf-8'));
            } catch {
                return createErrorResult('PARSING_ERROR', 'Invalid JSON format', 'url');
            }
            const rows = normalizeJsonToRows(json);
            if (rows.length === 0) {
                return createErrorResult('EMPTY_DATASET', 'The JSON data contains no records', 'url');
            }
            const csvBuffer = Buffer.from(Papa.unparse(rows));
            const { data, sampled } = enforceRowLimit(rows);
            return createSuccessResult(data, csvBuffer, 'text/csv', fileName.replace(/\.json$/, '.csv'), {
                sourceType: 'url',
                contentType,
                responseSize: buffer.length,
                sampled,
            });
        }

        // Excel
        if (ext === 'xlsx' || ext === 'xls' || contentType.includes('spreadsheet')) {
            try {
                const workbook = XLSX.read(buffer, { type: 'buffer' });
                if (workbook.SheetNames.length === 0) {
                    return createErrorResult('EMPTY_DATASET', 'The Excel file contains no sheets', 'url');
                }
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(firstSheet);
                if (rows.length === 0) {
                    return createErrorResult('EMPTY_DATASET', 'The Excel sheet contains no data', 'url');
                }
                const { data, sampled } = enforceRowLimit(rows);
                return createSuccessResult(data, buffer, contentType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', fileName, {
                    sourceType: 'url',
                    contentType,
                    responseSize: buffer.length,
                    sampled,
                });
            } catch {
                return createErrorResult('PARSING_ERROR', 'Failed to parse Excel file. It may be corrupted.', 'url');
            }
        }

        return createErrorResult(
            'UNSUPPORTED_CONTENT_TYPE',
            `Unsupported file format. Detected: ${contentType || ext || 'unknown'}. Use CSV, JSON, or Excel.`,
            'url'
        );
    } catch (error: any) {
        return createErrorResult('PARSING_ERROR', error.message || 'Failed to parse data', 'url');
    }
}

// ── 2. REST API Fetcher ────────────────────────────────────────────────

export async function fetchFromAPI(config: DataSourceConfig): Promise<DataSourceResult> {
    const { url, headers = {}, method = 'GET', body } = config;

    if (!url) {
        return createErrorResult('INVALID_URL', 'URL is required', 'api');
    }

    // Validate URL
    const urlValidation = validateUrl(url);
    if (!urlValidation.valid) {
        return createErrorResult('INVALID_URL', urlValidation.error!, 'api');
    }

    // Sanitize headers
    const sanitizedHeaders = sanitizeHeaders(headers);

    const fetchResult = await secureFetch(url, {
        timeoutMs: DATA_SOURCE_LIMITS.REQUEST_TIMEOUT_MS,
        maxResponseSize: DATA_SOURCE_LIMITS.MAX_RESPONSE_SIZE,
        headers: sanitizedHeaders,
        method,
        body: method === 'POST' ? body : undefined,
    });

    if (!fetchResult.ok) {
        return createErrorResult(
            fetchResult.errorCode as DataSourceErrorCode,
            fetchResult.error!,
            'api'
        );
    }

    try {
        const json = JSON.parse(fetchResult.buffer!.toString('utf-8'));
        const rows = normalizeApiResponse(json);

        if (rows.length === 0) {
            return createErrorResult('EMPTY_DATASET', 'API returned no data rows', 'api');
        }

        const csv = Papa.unparse(rows);
        const csvBuffer = Buffer.from(csv, 'utf-8');
        const { data, sampled } = enforceRowLimit(rows);

        return createSuccessResult(data, csvBuffer, 'text/csv', `api_data_${Date.now()}.csv`, {
            sourceType: 'api',
            contentType: fetchResult.response?.headers.get('content-type') || 'application/json',
            responseSize: fetchResult.buffer!.length,
            sampled,
        });
    } catch (error: any) {
        if (error instanceof SyntaxError) {
            return createErrorResult('PARSING_ERROR', 'API returned invalid JSON', 'api');
        }
        return createErrorResult('PARSING_ERROR', error.message || 'Failed to parse API response', 'api');
    }
}

// ── 3. Google Sheets Fetcher ───────────────────────────────────────────

export async function fetchFromGoogleSheets(sheetUrl: string): Promise<DataSourceResult> {
    const match = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
        return createErrorResult(
            'INVALID_URL',
            'Invalid Google Sheets URL. Expected format: https://docs.google.com/spreadsheets/d/{id}/...',
            'google-sheets'
        );
    }

    const spreadsheetId = match[1];
    const gidMatch = sheetUrl.match(/gid=(\d+)/);
    const gid = gidMatch ? gidMatch[1] : '0';

    const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;

    const fetchResult = await secureFetch(exportUrl, {
        timeoutMs: DATA_SOURCE_LIMITS.REQUEST_TIMEOUT_MS,
        maxResponseSize: DATA_SOURCE_LIMITS.MAX_RESPONSE_SIZE,
        maxRedirects: 3,
    });

    if (!fetchResult.ok) {
        if (fetchResult.errorCode === 'SOURCE_NOT_FOUND') {
            return createErrorResult(
                'GOOGLE_SHEETS_NOT_FOUND',
                'Sheet not found. Make sure it is publicly accessible.',
                'google-sheets'
            );
        }
        if (fetchResult.errorCode === 'FORBIDDEN') {
            return createErrorResult(
                'GOOGLE_SHEETS_PRIVATE',
                'Sheet is private. Please set it to "Anyone with the link" sharing.',
                'google-sheets'
            );
        }
        return createErrorResult(
            fetchResult.errorCode as DataSourceErrorCode,
            fetchResult.error!,
            'google-sheets'
        );
    }

    try {
        const rows = parseCsvBuffer(fetchResult.buffer!);
        if (rows.length === 0) {
            return createErrorResult('EMPTY_DATASET', 'The Google Sheet contains no data', 'google-sheets');
        }
        const { data, sampled } = enforceRowLimit(rows);
        return createSuccessResult(data, fetchResult.buffer!, 'text/csv', `sheets_${spreadsheetId}.csv`, {
            sourceType: 'google-sheets',
            contentType: fetchResult.response?.headers.get('content-type') || 'text/csv',
            responseSize: fetchResult.buffer!.length,
            sampled,
        });
    } catch (error: any) {
        return createErrorResult('PARSING_ERROR', error.message || 'Failed to parse Google Sheet', 'google-sheets');
    }
}

// ── 4. S3 Bucket Fetcher ───────────────────────────────────────────────

export async function fetchFromS3(
    s3Url: string,
    credentials?: { accessKeyId: string; secretAccessKey: string; region?: string }
): Promise<DataSourceResult> {
    const parsed = parseS3Url(s3Url);
    if (!parsed) {
        return createErrorResult(
            'INVALID_URL',
            'Invalid S3 URL format. Use s3://bucket/key or https://bucket.s3.region.amazonaws.com/key',
            's3'
        );
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
            return createErrorResult('EMPTY_RESPONSE', 'Empty response from S3', 's3');
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

        // Check size limit
        if (buffer.length > DATA_SOURCE_LIMITS.MAX_RESPONSE_SIZE) {
            return createErrorResult(
                'FILE_TOO_LARGE',
                `File too large (${buffer.length} bytes, max ${DATA_SOURCE_LIMITS.MAX_RESPONSE_SIZE})`,
                's3'
            );
        }

        // CSV/TSV
        if (ext === 'csv' || ext === 'tsv') {
            const rows = parseCsvBuffer(buffer);
            if (rows.length === 0) {
                return createErrorResult('EMPTY_DATASET', 'The CSV file contains no data rows', 's3');
            }
            const { data, sampled } = enforceRowLimit(rows);
            return createSuccessResult(data, buffer, 'text/csv', fileName, {
                sourceType: 's3',
                contentType,
                responseSize: buffer.length,
                sampled,
            });
        }

        // JSON
        if (ext === 'json') {
            let json: any;
            try {
                json = JSON.parse(buffer.toString('utf-8'));
            } catch {
                return createErrorResult('PARSING_ERROR', 'Invalid JSON in S3 object', 's3');
            }
            const rows = normalizeJsonToRows(json);
            if (rows.length === 0) {
                return createErrorResult('EMPTY_DATASET', 'The JSON data contains no records', 's3');
            }
            const csvBuffer = Buffer.from(Papa.unparse(rows));
            const { data, sampled } = enforceRowLimit(rows);
            return createSuccessResult(data, csvBuffer, 'text/csv', fileName.replace(/\.json$/, '.csv'), {
                sourceType: 's3',
                contentType,
                responseSize: buffer.length,
                sampled,
            });
        }

        // Excel
        if (ext === 'xlsx' || ext === 'xls') {
            try {
                const workbook = XLSX.read(buffer, { type: 'buffer' });
                if (workbook.SheetNames.length === 0) {
                    return createErrorResult('EMPTY_DATASET', 'The Excel file contains no sheets', 's3');
                }
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(firstSheet);
                if (rows.length === 0) {
                    return createErrorResult('EMPTY_DATASET', 'The Excel sheet contains no data', 's3');
                }
                const { data, sampled } = enforceRowLimit(rows);
                return createSuccessResult(data, buffer, contentType, fileName, {
                    sourceType: 's3',
                    contentType,
                    responseSize: buffer.length,
                    sampled,
                });
            } catch {
                return createErrorResult('PARSING_ERROR', 'Failed to parse Excel file from S3', 's3');
            }
        }

        return createErrorResult(
            'UNSUPPORTED_CONTENT_TYPE',
            `Unsupported file type: .${ext}. Use CSV, JSON, or Excel.`,
            's3'
        );
    } catch (error: any) {
        if (error.name === 'NoSuchKey') {
            return createErrorResult('S3_OBJECT_NOT_FOUND', 'File not found in S3 bucket', 's3');
        }
        if (error.name === 'AccessDenied') {
            return createErrorResult(
                'S3_ACCESS_DENIED',
                'Access denied. Check your AWS credentials and bucket permissions.',
                's3'
            );
        }
        if (error.name === 'TimeoutError' || error.name === 'AbortError') {
            return createErrorResult('TIMEOUT', 'S3 request timed out', 's3');
        }
        return createErrorResult('NETWORK_ERROR', error.message || 'Failed to fetch from S3', 's3');
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

                const urlValidation = validateUrl(config.url);
                if (!urlValidation.valid) {
                    return { reachable: false, error: urlValidation.error };
                }

                const fetchResult = await secureFetch(config.url, {
                    timeoutMs: DATA_SOURCE_LIMITS.TEST_TIMEOUT_MS,
                    method: 'HEAD',
                });

                if (!fetchResult.ok) {
                    return { reachable: false, error: fetchResult.error };
                }

                return {
                    reachable: true,
                    metadata: { format: fetchResult.response?.headers.get('content-type') || 'unknown' },
                };
            }

            case 'api': {
                if (!config.url) return { reachable: false, error: 'URL is required' };

                const urlValidation = validateUrl(config.url);
                if (!urlValidation.valid) {
                    return { reachable: false, error: urlValidation.error };
                }

                const headers = config.headers ? (() => {
                    try { return JSON.parse(config.headers); }
                    catch { return {}; }
                })() : {};

                const sanitizedHeaders = sanitizeHeaders(headers);

                const fetchResult = await secureFetch(config.url, {
                    timeoutMs: DATA_SOURCE_LIMITS.TEST_TIMEOUT_MS,
                    headers: sanitizedHeaders,
                });

                if (!fetchResult.ok) {
                    return { reachable: false, error: fetchResult.error };
                }

                try {
                    const json = JSON.parse(fetchResult.buffer!.toString('utf-8'));
                    const rows = normalizeApiResponse(json);
                    return {
                        reachable: true,
                        samplePreview: rows.slice(0, 5),
                        columnCount: rows[0] ? Object.keys(rows[0]).length : 0,
                        metadata: { format: 'json', estimatedRows: rows.length },
                    };
                } catch {
                    return { reachable: false, error: 'API returned invalid JSON' };
                }
            }

            case 'google-sheets': {
                if (!config.url) return { reachable: false, error: 'URL is required' };

                const match = config.url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
                if (!match) return { reachable: false, error: 'Invalid Google Sheets URL' };

                const testUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv&gid=0`;

                const urlValidation = validateUrl(testUrl);
                if (!urlValidation.valid) {
                    return { reachable: false, error: urlValidation.error };
                }

                const fetchResult = await secureFetch(testUrl, {
                    timeoutMs: DATA_SOURCE_LIMITS.TEST_TIMEOUT_MS,
                });

                if (!fetchResult.ok) {
                    return { reachable: false, error: fetchResult.error };
                }

                const parsed = Papa.parse(fetchResult.buffer!.toString('utf-8'), {
                    header: true,
                    dynamicTyping: true,
                    skipEmptyLines: true,
                });

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
                return { reachable: false, error: `Unknown source type: ${type}` };
        }
    } catch (error: any) {
        return { reachable: false, error: error.message || 'Connection test failed' };
    }
}

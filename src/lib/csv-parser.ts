import Papa from 'papaparse';

export interface CSVParseResult {
    data: any[];
    errors: any[];
    meta: {
        delimiter: string;
        linebreak: string;
        aborted: boolean;
        truncated: boolean;
        cursor: number;
        fields?: string[];
    };
    rowCount: number;
}

export interface ParseOptions {
    preview?: boolean;
    header?: boolean;
    worker?: boolean;
    step?: (row: any, parser: any) => void;
    complete?: (results: any) => void;
}

/**
 * Parses a CSV file efficiently using PapaParse.
 * For large files, it uses a web worker to avoid blocking the main thread.
 */
export const parseCSV = (file: File, options: ParseOptions = {}): Promise<CSVParseResult> => {
    const { preview, worker, ...restOptions } = options;

    return new Promise((resolve, reject) => {
        // @ts-ignore
        Papa.parse(file as any, {
            header: true,
            skipEmptyLines: true,
            worker: worker ?? true, // Default to worker for performance
            preview: preview ? 100 : 0, // Preview first 100 rows if requested
            complete: (results) => {
                resolve({
                    data: results.data,
                    errors: results.errors,
                    meta: results.meta,
                    rowCount: results.data.length
                });
            },
            error: (error) => {
                reject(error);
            },
            ...restOptions
        });
    });
};

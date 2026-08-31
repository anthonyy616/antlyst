/**
 * Data Transformation and Processing Pipeline
 *
 * Allows users to clean and transform datasets through ordered steps.
 * All transformations are reproducible, traceable, and reversible.
 *
 * Pipeline: Raw Dataset → Step 1 → Step 2 → ... → Step N → Transformed Dataset
 */

// ── Types ──────────────────────────────────────────────────────────────

export type TransformationType =
    | 'remove_missing'
    | 'fill_missing'
    | 'remove_duplicates'
    | 'rename_column'
    | 'change_type'
    | 'filter_rows'
    | 'sort_rows'
    | 'group_by'
    | 'aggregate'
    | 'calculated_column'
    | 'date_transform'
    | 'join'
    | 'merge'
    | 'select_columns'
    | 'drop_columns';

export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export type AggregateFunction = 'sum' | 'mean' | 'count' | 'min' | 'max' | 'median' | 'std';

export type DateTransformType =
    | 'extract_year'
    | 'extract_month'
    | 'extract_day'
    | 'extract_weekday'
    | 'extract_hour'
    | 'format_date'
    | 'to_date';

export type ComparisonOperator =
    | 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte'
    | 'contains' | 'not_contains'
    | 'starts_with' | 'ends_with'
    | 'in' | 'not_in'
    | 'is_null' | 'is_not_null';

export type JoinType = 'inner' | 'left' | 'right' | 'full';

export interface TransformationStep {
    id: string;
    type: TransformationType;
    enabled: boolean;
    config: TransformationConfig;
    status: StepStatus;
    error?: string;
    executedAt?: string;
    inputSchema: SchemaInfo;
    outputSchema?: SchemaInfo;
}

export interface TransformationConfig {
    // remove_missing / remove_duplicates
    columns?: string[];

    // fill_missing
    value?: any;
    method?: 'value' | 'mean' | 'median' | 'mode' | 'forward_fill';

    // rename_column
    renames?: Record<string, string>;

    // change_type
    column?: string;
    targetType?: 'string' | 'number' | 'boolean' | 'date';

    // filter_rows
    conditions?: FilterCondition[];

    // sort_rows
    sortColumn?: string;
    sortOrder?: 'asc' | 'desc';

    // group_by / aggregate
    groupColumns?: string[];
    aggregations?: AggregationConfig[];

    // calculated_column
    newColumnName?: string;
    expression?: string;

    // date_transform
    dateColumn?: string;
    dateTransformType?: DateTransformType;
    outputColumn?: string;
    outputFormat?: string;

    // join / merge
    joinType?: JoinType;
    joinColumn?: string;
    joinColumns?: string[];
    rightDataset?: any[];

    // select_columns / drop_columns
    selectedColumns?: string[];
    droppedColumns?: string[];
}

export interface FilterCondition {
    column: string;
    operator: ComparisonOperator;
    value?: any;
}

export interface AggregationConfig {
    column: string;
    function: AggregateFunction;
    alias?: string;
}

export interface SchemaInfo {
    columns: string[];
    columnTypes: Record<string, string>;
    rowCount: number;
}

export interface PipelineConfig {
    id: string;
    name: string;
    steps: TransformationStep[];
    createdAt: string;
    updatedAt: string;
    originalDataset?: any[];
}

export interface TransformationResult {
    success: boolean;
    data: any[];
    pipeline: PipelineConfig;
    stepResults: StepResult[];
    originalRowCount: number;
    finalRowCount: number;
    errors: string[];
}

export interface StepResult {
    stepId: string;
    type: TransformationType;
    status: StepStatus;
    inputRowCount: number;
    outputRowCount: number;
    error?: string;
    executedAt: string;
}

// ── Schema Helpers ─────────────────────────────────────────────────────

function inferSchema(rows: any[]): SchemaInfo {
    if (rows.length === 0) {
        return { columns: [], columnTypes: {}, rowCount: 0 };
    }

    const columns = Object.keys(rows[0]);
    const columnTypes: Record<string, string> = {};

    for (const col of columns) {
        const sample = rows.slice(0, 100);
        const types = sample
            .map(r => r[col])
            .filter(v => v !== null && v !== undefined)
            .map(v => typeof v);

        const typeCounts: Record<string, number> = {};
        for (const t of types) {
            typeCounts[t] = (typeCounts[t] || 0) + 1;
        }

        const dominantType = Object.entries(typeCounts)
            .sort(([, a], [, b]) => b - a)[0]?.[0] || 'unknown';
        columnTypes[col] = dominantType;
    }

    return { columns, columnTypes, rowCount: rows.length };
}

function cloneRows(rows: any[]): any[] {
    return rows.map(row => ({ ...row }));
}

// ── Individual Transformation Operations ───────────────────────────────

function removeMissing(rows: any[], config: TransformationConfig): any[] {
    const columns = config.columns || Object.keys(rows[0] || {});
    return rows.filter(row =>
        columns.every(col => row[col] !== null && row[col] !== undefined && row[col] !== '')
    );
}

function fillMissing(rows: any[], config: TransformationConfig): any[] {
    const columns = config.columns || Object.keys(rows[0] || {});
    const result = cloneRows(rows);

    if (config.method === 'value' || !config.method) {
        for (const row of result) {
            for (const col of columns) {
                if (row[col] === null || row[col] === undefined || row[col] === '') {
                    row[col] = config.value ?? null;
                }
            }
        }
    } else if (config.method === 'mean' || config.method === 'median' || config.method === 'mode') {
        for (const col of columns) {
            const values = result
                .map(r => r[col])
                .filter(v => v !== null && v !== undefined && v !== '' && typeof v === 'number');

            let fillValue: any;
            if (config.method === 'mean') {
                fillValue = values.length > 0
                    ? values.reduce((a: number, b: number) => a + b, 0) / values.length
                    : 0;
            } else if (config.method === 'median') {
                const sorted = [...values].sort((a, b) => a - b);
                const mid = Math.floor(sorted.length / 2);
                fillValue = sorted.length > 0
                    ? sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
                    : 0;
            } else {
                // mode
                const counts: Record<number, number> = {};
                for (const v of values) {
                    counts[v] = (counts[v] || 0) + 1;
                }
                fillValue = Object.entries(counts)
                    .sort(([, a], [, b]) => b - a)[0]?.[0] ?? 0;
            }

            for (const row of result) {
                if (row[col] === null || row[col] === undefined || row[col] === '') {
                    row[col] = fillValue;
                }
            }
        }
    } else if (config.method === 'forward_fill') {
        for (const col of columns) {
            let lastValid: any = null;
            for (const row of result) {
                if (row[col] !== null && row[col] !== undefined && row[col] !== '') {
                    lastValid = row[col];
                } else if (lastValid !== null) {
                    row[col] = lastValid;
                }
            }
        }
    }

    return result;
}

function removeDuplicates(rows: any[], config: TransformationConfig): any[] {
    const columns = config.columns || Object.keys(rows[0] || {});
    const seen = new Set<string>();
    return rows.filter(row => {
        const key = columns.map(c => JSON.stringify(row[c])).join('|');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function renameColumns(rows: any[], config: TransformationConfig): any[] {
    if (!config.renames || Object.keys(config.renames).length === 0) return rows;
    return rows.map(row => {
        const newRow: any = {};
        for (const [key, value] of Object.entries(row)) {
            newRow[config.renames![key] || key] = value;
        }
        return newRow;
    });
}

function changeType(rows: any[], config: TransformationConfig): any[] {
    if (!config.column || !config.targetType) return rows;
    return rows.map(row => {
        const newRow = { ...row };
        const val = newRow[config.column!];
        if (val === null || val === undefined) return newRow;

        switch (config.targetType) {
            case 'string':
                newRow[config.column!] = String(val);
                break;
            case 'number':
                newRow[config.column!] = Number(val);
                break;
            case 'boolean':
                newRow[config.column!] = Boolean(val);
                break;
            case 'date':
                newRow[config.column!] = new Date(val).toISOString();
                break;
        }
        return newRow;
    });
}

function filterRows(rows: any[], config: TransformationConfig): any[] {
    if (!config.conditions || config.conditions.length === 0) return rows;

    return rows.filter(row => {
        return config.conditions!.every(condition => {
            const val = row[condition.column];
            return evaluateCondition(val, condition);
        });
    });
}

function evaluateCondition(val: any, condition: FilterCondition): boolean {
    const { operator, value } = condition;

    switch (operator) {
        case 'eq': return val === value;
        case 'neq': return val !== value;
        case 'gt': return val > value;
        case 'gte': return val >= value;
        case 'lt': return val < value;
        case 'lte': return val <= value;
        case 'contains': return String(val).includes(String(value));
        case 'not_contains': return !String(val).includes(String(value));
        case 'starts_with': return String(val).startsWith(String(value));
        case 'ends_with': return String(val).endsWith(String(value));
        case 'in': return Array.isArray(value) && value.includes(val);
        case 'not_in': return Array.isArray(value) && !value.includes(val);
        case 'is_null': return val === null || val === undefined;
        case 'is_not_null': return val !== null && val !== undefined;
        default: return true;
    }
}

function sortRows(rows: any[], config: TransformationConfig): any[] {
    if (!config.sortColumn) return rows;
    const sorted = cloneRows(rows);
    const col = config.sortColumn;
    const order = config.sortOrder === 'desc' ? -1 : 1;

    sorted.sort((a, b) => {
        const aVal = a[col];
        const bVal = b[col];
        if (aVal === bVal) return 0;
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        return aVal < bVal ? -order : order;
    });

    return sorted;
}

function groupBy(rows: any[], config: TransformationConfig): any[] {
    if (!config.groupColumns || config.groupColumns.length === 0) return rows;

    const groups: Record<string, any[]> = {};
    for (const row of rows) {
        const key = config.groupColumns!.map(c => JSON.stringify(row[c])).join('|');
        if (!groups[key]) groups[key] = [];
        groups[key].push(row);
    }

    const result: any[] = [];
    for (const [, groupRows] of Object.entries(groups)) {
        const newRow: any = {};
        // Add group key columns
        for (const col of config.groupColumns!) {
            newRow[col] = groupRows[0][col];
        }
        // Apply aggregations
        if (config.aggregations) {
            for (const agg of config.aggregations) {
                const alias = agg.alias || `${agg.function}_${agg.column}`;
                const values = groupRows
                    .map(r => r[agg.column])
                    .filter(v => typeof v === 'number' && !isNaN(v));

                switch (agg.function) {
                    case 'sum':
                        newRow[alias] = values.reduce((a, b) => a + b, 0);
                        break;
                    case 'mean':
                        newRow[alias] = values.length > 0
                            ? values.reduce((a, b) => a + b, 0) / values.length
                            : 0;
                        break;
                    case 'count':
                        newRow[alias] = groupRows.length;
                        break;
                    case 'min':
                        newRow[alias] = values.length > 0 ? Math.min(...values) : null;
                        break;
                    case 'max':
                        newRow[alias] = values.length > 0 ? Math.max(...values) : null;
                        break;
                    case 'median': {
                        const sorted = [...values].sort((a, b) => a - b);
                        const mid = Math.floor(sorted.length / 2);
                        newRow[alias] = sorted.length > 0
                            ? sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
                            : null;
                        break;
                    }
                    case 'std': {
                        const mean = values.length > 0
                            ? values.reduce((a, b) => a + b, 0) / values.length
                            : 0;
                        const variance = values.length > 0
                            ? values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / values.length
                            : 0;
                        newRow[alias] = Math.sqrt(variance);
                        break;
                    }
                }
            }
        }
        result.push(newRow);
    }

    return result;
}

function calculatedColumn(rows: any[], config: TransformationConfig): any[] {
    if (!config.newColumnName || !config.expression) return rows;

    return rows.map(row => {
        const newRow = { ...row };
        try {
            // Simple expression evaluation — supports column references and basic math
            let expr = config.expression!;
            for (const [key, val] of Object.entries(row)) {
                if (typeof val === 'number') {
                    expr = expr.replace(new RegExp(`\\b${key}\\b`, 'g'), String(val));
                }
            }
            // Only allow safe math operations
            if (/^[\d\s+\-*/().]+$/.test(expr)) {
                newRow[config.newColumnName!] = Function(`"use strict"; return (${expr})`)();
            } else {
                newRow[config.newColumnName!] = null;
            }
        } catch {
            newRow[config.newColumnName!] = null;
        }
        return newRow;
    });
}

function dateTransform(rows: any[], config: TransformationConfig): any[] {
    if (!config.dateColumn || !config.dateTransformType) return rows;

    const outputCol = config.outputColumn || `${config.dateColumn}_${config.dateTransformType}`;
    return rows.map(row => {
        const newRow = { ...row };
        const val = row[config.dateColumn!];
        if (val === null || val === undefined) {
            newRow[outputCol] = null;
            return newRow;
        }

        const d = new Date(val);
        if (isNaN(d.getTime())) {
            newRow[outputCol] = null;
            return newRow;
        }

        switch (config.dateTransformType) {
            case 'extract_year':
                newRow[outputCol] = d.getFullYear();
                break;
            case 'extract_month':
                newRow[outputCol] = d.getMonth() + 1;
                break;
            case 'extract_day':
                newRow[outputCol] = d.getDate();
                break;
            case 'extract_weekday':
                newRow[outputCol] = d.getDay();
                break;
            case 'extract_hour':
                newRow[outputCol] = d.getHours();
                break;
            case 'format_date':
                newRow[outputCol] = config.outputFormat
                    ? formatDate(d, config.outputFormat)
                    : d.toISOString();
                break;
            case 'to_date':
                newRow[outputCol] = d.toISOString();
                break;
        }

        return newRow;
    });
}

function formatDate(d: Date, format: string): string {
    return format
        .replace('YYYY', String(d.getFullYear()))
        .replace('MM', String(d.getMonth() + 1).padStart(2, '0'))
        .replace('DD', String(d.getDate()).padStart(2, '0'))
        .replace('HH', String(d.getHours()).padStart(2, '0'))
        .replace('mm', String(d.getMinutes()).padStart(2, '0'))
        .replace('ss', String(d.getSeconds()).padStart(2, '0'));
}

function joinDatasets(rows: any[], config: TransformationConfig): any[] {
    if (!config.rightDataset || !config.joinColumn) return rows;

    const joinType = config.joinType || 'inner';
    const rightCol = config.joinColumn;
    const leftCol = config.joinColumn;

    // Build right lookup
    const rightLookup: Record<string, any[]> = {};
    for (const row of config.rightDataset) {
        const key = String(row[rightCol]);
        if (!rightLookup[key]) rightLookup[key] = [];
        rightLookup[key].push(row);
    }

    const result: any[] = [];

    if (joinType === 'inner' || joinType === 'left') {
        for (const leftRow of rows) {
            const key = String(leftRow[leftCol]);
            const matches = rightLookup[key] || [];
            if (matches.length > 0) {
                for (const rightRow of matches) {
                    result.push({ ...leftRow, ...rightRow });
                }
            } else if (joinType === 'left') {
                result.push({ ...leftRow });
            }
        }
    } else if (joinType === 'right') {
        const leftLookup: Record<string, any[]> = {};
        for (const row of rows) {
            const key = String(row[leftCol]);
            if (!leftLookup[key]) leftLookup[key] = [];
            leftLookup[key].push(row);
        }

        for (const rightRow of config.rightDataset) {
            const key = String(rightRow[rightCol]);
            const matches = leftLookup[key] || [];
            if (matches.length > 0) {
                for (const leftRow of matches) {
                    result.push({ ...leftRow, ...rightRow });
                }
            } else {
                result.push({ ...rightRow });
            }
        }
    } else if (joinType === 'full') {
        // Full outer join
        const leftLookup: Record<string, any[]> = {};
        const matchedRight = new Set<string>();

        for (const row of rows) {
            const key = String(row[leftCol]);
            if (!leftLookup[key]) leftLookup[key] = [];
            leftLookup[key].push(row);
        }

        // Left-matched rows
        for (const leftRow of rows) {
            const key = String(leftRow[leftCol]);
            const matches = rightLookup[key] || [];
            if (matches.length > 0) {
                matchedRight.add(key);
                for (const rightRow of matches) {
                    result.push({ ...leftRow, ...rightRow });
                }
            } else {
                result.push({ ...leftRow });
            }
        }

        // Unmatched right rows
        for (const rightRow of config.rightDataset) {
            const key = String(rightRow[rightCol]);
            if (!matchedRight.has(key)) {
                result.push({ ...rightRow });
            }
        }
    }

    return result;
}

function mergeDatasets(rows: any[], config: TransformationConfig): any[] {
    if (!config.rightDataset) return rows;

    // Merge by concatenation with schema union
    const rightCols = Object.keys(config.rightDataset[0] || {});
    const leftExtended = rows.map(row => {
        const newRow = { ...row };
        for (const col of rightCols) {
            if (!(col in newRow)) newRow[col] = null;
        }
        return newRow;
    });

    const rightExtended = config.rightDataset.map(row => {
        const newRow: any = {};
        // Fill left columns with null
        for (const col of Object.keys(rows[0] || {})) {
            newRow[col] = null;
        }
        Object.assign(newRow, row);
        return newRow;
    });

    return [...leftExtended, ...rightExtended];
}

function selectColumns(rows: any[], config: TransformationConfig): any[] {
    if (!config.selectedColumns) return rows;
    return rows.map(row => {
        const newRow: any = {};
        for (const col of config.selectedColumns!) {
            if (col in row) newRow[col] = row[col];
        }
        return newRow;
    });
}

function dropColumns(rows: any[], config: TransformationConfig): any[] {
    if (!config.droppedColumns) return rows;
    const toDrop = new Set(config.droppedColumns);
    return rows.map(row => {
        const newRow: any = {};
        for (const [key, val] of Object.entries(row)) {
            if (!toDrop.has(key)) newRow[key] = val;
        }
        return newRow;
    });
}

// ── Step Dispatcher ────────────────────────────────────────────────────

function executeStep(rows: any[], step: TransformationStep): any[] {
    switch (step.type) {
        case 'remove_missing': return removeMissing(rows, step.config);
        case 'fill_missing': return fillMissing(rows, step.config);
        case 'remove_duplicates': return removeDuplicates(rows, step.config);
        case 'rename_column': return renameColumns(rows, step.config);
        case 'change_type': return changeType(rows, step.config);
        case 'filter_rows': return filterRows(rows, step.config);
        case 'sort_rows': return sortRows(rows, step.config);
        case 'group_by': return groupBy(rows, step.config);
        case 'aggregate': return groupBy(rows, step.config);
        case 'calculated_column': return calculatedColumn(rows, step.config);
        case 'date_transform': return dateTransform(rows, step.config);
        case 'join': return joinDatasets(rows, step.config);
        case 'merge': return mergeDatasets(rows, step.config);
        case 'select_columns': return selectColumns(rows, step.config);
        case 'drop_columns': return dropColumns(rows, step.config);
        default: return rows;
    }
}

// ── Pipeline Validation ────────────────────────────────────────────────

export interface ValidationError {
    stepId: string;
    message: string;
}

export function validatePipeline(
    steps: TransformationStep[],
    _originalColumns: string[]
): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const step of steps) {
        if (!step.enabled) continue;

        switch (step.type) {
            case 'fill_missing':
                if (step.config.method === 'mean' || step.config.method === 'median' || step.config.method === 'mode') {
                    // Verify columns are numeric — can't validate without data, just check config exists
                }
                break;
            case 'rename_column':
                if (!step.config.renames || Object.keys(step.config.renames).length === 0) {
                    errors.push({ stepId: step.id, message: 'Rename requires at least one column mapping.' });
                }
                break;
            case 'change_type':
                if (!step.config.column || !step.config.targetType) {
                    errors.push({ stepId: step.id, message: 'Type change requires a column and target type.' });
                }
                break;
            case 'filter_rows':
                if (!step.config.conditions || step.config.conditions.length === 0) {
                    errors.push({ stepId: step.id, message: 'Filter requires at least one condition.' });
                }
                break;
            case 'sort_rows':
                if (!step.config.sortColumn) {
                    errors.push({ stepId: step.id, message: 'Sort requires a column to sort by.' });
                }
                break;
            case 'group_by':
                if (!step.config.groupColumns || step.config.groupColumns.length === 0) {
                    errors.push({ stepId: step.id, message: 'Group by requires at least one group column.' });
                }
                break;
            case 'calculated_column':
                if (!step.config.newColumnName || !step.config.expression) {
                    errors.push({ stepId: step.id, message: 'Calculated column requires a name and expression.' });
                }
                break;
            case 'date_transform':
                if (!step.config.dateColumn || !step.config.dateTransformType) {
                    errors.push({ stepId: step.id, message: 'Date transform requires a column and transform type.' });
                }
                break;
            case 'join':
                if (!step.config.joinColumn || !step.config.rightDataset) {
                    errors.push({ stepId: step.id, message: 'Join requires a join column and right dataset.' });
                }
                break;
        }
    }

    return errors;
}

// ── Pipeline Execution ─────────────────────────────────────────────────

/**
 * Execute a full transformation pipeline on a dataset.
 *
 * @param data - Original dataset rows
 * @param steps - Ordered transformation steps
 * @param preserveOriginal - If true, stores original data for recovery
 * @returns TransformationResult with transformed data and step-by-step results
 */
export function executePipeline(
    data: any[],
    steps: TransformationStep[],
    preserveOriginal: boolean = true
): TransformationResult {
    const errors: string[] = [];
    const stepResults: StepResult[] = [];

    // Validate first
    const validationErrors = validatePipeline(steps, data.length > 0 ? Object.keys(data[0]) : []);
    if (validationErrors.length > 0) {
        return {
            success: false,
            data: [],
            pipeline: {
                id: '',
                name: '',
                steps,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
            stepResults: [],
            originalRowCount: data.length,
            finalRowCount: 0,
            errors: validationErrors.map(e => `Step ${e.stepId}: ${e.message}`),
        };
    }

    let currentData = cloneRows(data);
    const originalRowCount = currentData.length;

    for (const step of steps) {
        if (!step.enabled) {
            step.status = 'skipped';
            stepResults.push({
                stepId: step.id,
                type: step.type,
                status: 'skipped',
                inputRowCount: currentData.length,
                outputRowCount: currentData.length,
                executedAt: new Date().toISOString(),
            });
            continue;
        }

        step.status = 'running';
        step.inputSchema = inferSchema(currentData);
        const inputRowCount = currentData.length;

        try {
            currentData = executeStep(currentData, step);
            step.status = 'completed';
            step.outputSchema = inferSchema(currentData);
            step.executedAt = new Date().toISOString();

            stepResults.push({
                stepId: step.id,
                type: step.type,
                status: 'completed',
                inputRowCount,
                outputRowCount: currentData.length,
                executedAt: step.executedAt,
            });
        } catch (err) {
            step.status = 'failed';
            step.error = err instanceof Error ? err.message : String(err);
            errors.push(`Step ${step.id} (${step.type}): ${step.error}`);

            stepResults.push({
                stepId: step.id,
                type: step.type,
                status: 'failed',
                inputRowCount,
                outputRowCount: currentData.length,
                error: step.error,
                executedAt: new Date().toISOString(),
            });

            // Stop pipeline on error
            break;
        }
    }

    // Build pipeline config
    const pipeline: PipelineConfig = {
        id: `pipeline-${Date.now()}`,
        name: 'Transformation Pipeline',
        steps,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        originalDataset: preserveOriginal ? cloneRows(data) : undefined,
    };

    return {
        success: errors.length === 0,
        data: currentData,
        pipeline,
        stepResults,
        originalRowCount,
        finalRowCount: currentData.length,
        errors,
    };
}

// ── Utility: Create a step helper ──────────────────────────────────────

let stepCounter = 0;

export function createStep(
    type: TransformationType,
    config: TransformationConfig = {},
    enabled: boolean = true
): TransformationStep {
    stepCounter++;
    return {
        id: `step-${stepCounter}-${Date.now()}`,
        type,
        enabled,
        config,
        status: 'pending',
        inputSchema: { columns: [], columnTypes: {}, rowCount: 0 },
    };
}

/**
 * Reset step counter (for testing).
 */
export function resetStepCounter(): void {
    stepCounter = 0;
}

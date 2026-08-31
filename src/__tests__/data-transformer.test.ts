import { describe, it, expect, beforeEach } from 'vitest';
import {
    executePipeline,
    validatePipeline,
    createStep,
    resetStepCounter,
    TransformationStep,
    TransformationConfig,
} from '../lib/data-transformer';

function makeRows(data: Record<string, any>[]): any[] {
    return data;
}

describe('data-transformer', () => {
    beforeEach(() => {
        resetStepCounter();
    });

    describe('remove_missing', () => {
        it('removes rows with missing values in specified columns', () => {
            const data = makeRows([
                { name: 'Alice', age: 30 },
                { name: null, age: 25 },
                { name: 'Charlie', age: 35 },
            ]);
            const steps = [createStep('remove_missing', { columns: ['name'] })];
            const result = executePipeline(data, steps);
            expect(result.data).toHaveLength(2);
            expect(result.data[0].name).toBe('Alice');
            expect(result.data[1].name).toBe('Charlie');
        });

        it('removes rows with empty string values', () => {
            const data = makeRows([
                { name: 'Alice', age: 30 },
                { name: '', age: 25 },
            ]);
            const steps = [createStep('remove_missing', { columns: ['name'] })];
            const result = executePipeline(data, steps);
            expect(result.data).toHaveLength(1);
        });
    });

    describe('fill_missing', () => {
        it('fills missing values with a constant', () => {
            const data = makeRows([
                { name: 'Alice', age: 30 },
                { name: null, age: 25 },
            ]);
            const steps = [createStep('fill_missing', { columns: ['name'], value: 'Unknown' })];
            const result = executePipeline(data, steps);
            expect(result.data[1].name).toBe('Unknown');
        });

        it('fills missing values with mean', () => {
            const data = makeRows([
                { score: 10 },
                { score: null },
                { score: 20 },
            ]);
            const steps = [createStep('fill_missing', { columns: ['score'], method: 'mean' })];
            const result = executePipeline(data, steps);
            expect(result.data[1].score).toBe(15);
        });

        it('fills missing values with forward fill', () => {
            const data = makeRows([
                { val: 'a' },
                { val: null },
                { val: 'b' },
                { val: null },
            ]);
            const steps = [createStep('fill_missing', { columns: ['val'], method: 'forward_fill' })];
            const result = executePipeline(data, steps);
            expect(result.data[1].val).toBe('a');
            expect(result.data[3].val).toBe('b');
        });
    });

    describe('remove_duplicates', () => {
        it('removes duplicate rows based on specified columns', () => {
            const data = makeRows([
                { name: 'Alice', age: 30 },
                { name: 'Alice', age: 30 },
                { name: 'Bob', age: 25 },
            ]);
            const steps = [createStep('remove_duplicates', { columns: ['name'] })];
            const result = executePipeline(data, steps);
            expect(result.data).toHaveLength(2);
        });
    });

    describe('rename_column', () => {
        it('renames columns', () => {
            const data = makeRows([
                { name: 'Alice', age: 30 },
            ]);
            const steps = [createStep('rename_column', { renames: { name: 'full_name' } })];
            const result = executePipeline(data, steps);
            expect(result.data[0]).toHaveProperty('full_name');
            expect(result.data[0]).not.toHaveProperty('name');
        });
    });

    describe('change_type', () => {
        it('converts string to number', () => {
            const data = makeRows([
                { val: '42' },
                { val: '100' },
            ]);
            const steps = [createStep('change_type', { column: 'val', targetType: 'number' })];
            const result = executePipeline(data, steps);
            expect(typeof result.data[0].val).toBe('number');
            expect(result.data[0].val).toBe(42);
        });
    });

    describe('filter_rows', () => {
        it('filters rows by equality', () => {
            const data = makeRows([
                { name: 'Alice', status: 'active' },
                { name: 'Bob', status: 'inactive' },
                { name: 'Charlie', status: 'active' },
            ]);
            const steps = [createStep('filter_rows', {
                conditions: [{ column: 'status', operator: 'eq', value: 'active' }],
            })];
            const result = executePipeline(data, steps);
            expect(result.data).toHaveLength(2);
        });

        it('filters rows by greater than', () => {
            const data = makeRows([
                { name: 'Alice', age: 30 },
                { name: 'Bob', age: 25 },
                { name: 'Charlie', age: 35 },
            ]);
            const steps = [createStep('filter_rows', {
                conditions: [{ column: 'age', operator: 'gt', value: 28 }],
            })];
            const result = executePipeline(data, steps);
            expect(result.data).toHaveLength(2);
        });

        it('filters rows with contains operator', () => {
            const data = makeRows([
                { name: 'Alice Smith' },
                { name: 'Bob Jones' },
                { name: 'Alice Johnson' },
            ]);
            const steps = [createStep('filter_rows', {
                conditions: [{ column: 'name', operator: 'contains', value: 'Alice' }],
            })];
            const result = executePipeline(data, steps);
            expect(result.data).toHaveLength(2);
        });

        it('filters rows with is_null operator', () => {
            const data = makeRows([
                { name: 'Alice', email: 'a@test.com' },
                { name: 'Bob', email: null },
            ]);
            const steps = [createStep('filter_rows', {
                conditions: [{ column: 'email', operator: 'is_null' }],
            })];
            const result = executePipeline(data, steps);
            expect(result.data).toHaveLength(1);
            expect(result.data[0].name).toBe('Bob');
        });

        it('combines multiple conditions with AND', () => {
            const data = makeRows([
                { name: 'Alice', age: 30, dept: 'eng' },
                { name: 'Bob', age: 25, dept: 'eng' },
                { name: 'Charlie', age: 35, dept: 'sales' },
            ]);
            const steps = [createStep('filter_rows', {
                conditions: [
                    { column: 'age', operator: 'gt', value: 28 },
                    { column: 'dept', operator: 'eq', value: 'eng' },
                ],
            })];
            const result = executePipeline(data, steps);
            expect(result.data).toHaveLength(1);
            expect(result.data[0].name).toBe('Alice');
        });
    });

    describe('sort_rows', () => {
        it('sorts ascending', () => {
            const data = makeRows([
                { name: 'Charlie', score: 80 },
                { name: 'Alice', score: 95 },
                { name: 'Bob', score: 85 },
            ]);
            const steps = [createStep('sort_rows', { sortColumn: 'score', sortOrder: 'asc' })];
            const result = executePipeline(data, steps);
            expect(result.data[0].score).toBe(80);
            expect(result.data[2].score).toBe(95);
        });

        it('sorts descending', () => {
            const data = makeRows([
                { name: 'Charlie', score: 80 },
                { name: 'Alice', score: 95 },
                { name: 'Bob', score: 85 },
            ]);
            const steps = [createStep('sort_rows', { sortColumn: 'score', sortOrder: 'desc' })];
            const result = executePipeline(data, steps);
            expect(result.data[0].score).toBe(95);
            expect(result.data[2].score).toBe(80);
        });
    });

    describe('group_by + aggregate', () => {
        it('groups and sums', () => {
            const data = makeRows([
                { dept: 'eng', salary: 100 },
                { dept: 'eng', salary: 120 },
                { dept: 'sales', salary: 90 },
                { dept: 'sales', salary: 80 },
            ]);
            const steps = [createStep('group_by', {
                groupColumns: ['dept'],
                aggregations: [{ column: 'salary', function: 'sum', alias: 'total_salary' }],
            })];
            const result = executePipeline(data, steps);
            expect(result.data).toHaveLength(2);
            const eng = result.data.find((r: any) => r.dept === 'eng');
            expect(eng.total_salary).toBe(220);
        });

        it('groups and counts', () => {
            const data = makeRows([
                { dept: 'eng' },
                { dept: 'eng' },
                { dept: 'sales' },
            ]);
            const steps = [createStep('group_by', {
                groupColumns: ['dept'],
                aggregations: [{ column: 'dept', function: 'count', alias: 'count' }],
            })];
            const result = executePipeline(data, steps);
            expect(result.data).toHaveLength(2);
            const eng = result.data.find((r: any) => r.dept === 'eng');
            expect(eng.count).toBe(2);
        });
    });

    describe('calculated_column', () => {
        it('creates a calculated column from expression', () => {
            const data = makeRows([
                { price: 10, quantity: 2 },
                { price: 20, quantity: 3 },
            ]);
            const steps = [createStep('calculated_column', {
                newColumnName: 'total',
                expression: 'price * quantity',
            })];
            const result = executePipeline(data, steps);
            expect(result.data[0].total).toBe(20);
            expect(result.data[1].total).toBe(60);
        });
    });

    describe('date_transform', () => {
        it('extracts year from date', () => {
            const data = makeRows([
                { date: '2024-06-15' },
                { date: '2023-12-01' },
            ]);
            const steps = [createStep('date_transform', {
                dateColumn: 'date',
                dateTransformType: 'extract_year',
                outputColumn: 'year',
            })];
            const result = executePipeline(data, steps);
            expect(result.data[0].year).toBe(2024);
            expect(result.data[1].year).toBe(2023);
        });

        it('extracts month from date', () => {
            const data = makeRows([{ date: '2024-06-15' }]);
            const steps = [createStep('date_transform', {
                dateColumn: 'date',
                dateTransformType: 'extract_month',
                outputColumn: 'month',
            })];
            const result = executePipeline(data, steps);
            expect(result.data[0].month).toBe(6);
        });
    });

    describe('select_columns / drop_columns', () => {
        it('selects specific columns', () => {
            const data = makeRows([
                { a: 1, b: 2, c: 3 },
            ]);
            const steps = [createStep('select_columns', { selectedColumns: ['a', 'c'] })];
            const result = executePipeline(data, steps);
            expect(Object.keys(result.data[0])).toEqual(['a', 'c']);
        });

        it('drops specific columns', () => {
            const data = makeRows([
                { a: 1, b: 2, c: 3 },
            ]);
            const steps = [createStep('drop_columns', { droppedColumns: ['b'] })];
            const result = executePipeline(data, steps);
            expect(Object.keys(result.data[0])).toEqual(['a', 'c']);
        });
    });

    describe('join', () => {
        it('performs inner join', () => {
            const left = makeRows([
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' },
                { id: 3, name: 'Charlie' },
            ]);
            const right = [
                { id: 1, score: 95 },
                { id: 2, score: 85 },
            ];
            const steps = [createStep('join', {
                joinColumn: 'id',
                joinType: 'inner',
                rightDataset: right,
            })];
            const result = executePipeline(left, steps);
            expect(result.data).toHaveLength(2);
            expect(result.data[0].score).toBe(95);
        });

        it('performs left join', () => {
            const left = makeRows([
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' },
                { id: 3, name: 'Charlie' },
            ]);
            const right = [
                { id: 1, score: 95 },
            ];
            const steps = [createStep('join', {
                joinColumn: 'id',
                joinType: 'left',
                rightDataset: right,
            })];
            const result = executePipeline(left, steps);
            expect(result.data).toHaveLength(3);
            expect(result.data[2].score).toBeUndefined();
        });
    });

    describe('multi-step pipeline', () => {
        it('executes multiple steps in order', () => {
            const data = makeRows([
                { name: 'Alice', age: 30, dept: 'eng' },
                { name: null, age: 25, dept: 'eng' },
                { name: 'Charlie', age: 35, dept: 'sales' },
                { name: 'Charlie', age: 35, dept: 'sales' },
            ]);

            const steps = [
                createStep('remove_missing', { columns: ['name'] }),
                createStep('remove_duplicates', { columns: ['name'] }),
                createStep('sort_rows', { sortColumn: 'age', sortOrder: 'desc' }),
            ];

            const result = executePipeline(data, steps);
            expect(result.data).toHaveLength(2);
            expect(result.data[0].name).toBe('Charlie');
            expect(result.data[1].name).toBe('Alice');
            expect(result.success).toBe(true);
            expect(result.stepResults).toHaveLength(3);
            expect(result.stepResults.every(s => s.status === 'completed')).toBe(true);
        });
    });

    describe('pipeline validation', () => {
        it('returns errors for invalid rename', () => {
            const steps = [createStep('rename_column', { renames: {} })];
            const errors = validatePipeline(steps, ['name']);
            expect(errors).toHaveLength(1);
            expect(errors[0].message).toContain('Rename');
        });

        it('returns errors for missing filter conditions', () => {
            const steps = [createStep('filter_rows', { conditions: [] })];
            const errors = validatePipeline(steps, ['name']);
            expect(errors).toHaveLength(1);
        });

        it('returns no errors for valid pipeline', () => {
            const steps = [
                createStep('remove_missing', { columns: ['name'] }),
                createStep('sort_rows', { sortColumn: 'age' }),
            ];
            const errors = validatePipeline(steps, ['name', 'age']);
            expect(errors).toHaveLength(0);
        });
    });

    describe('error handling', () => {
        it('returns error result for invalid pipeline', () => {
            const data = makeRows([{ a: 1 }]);
            const steps = [createStep('rename_column', { renames: {} })];
            const result = executePipeline(data, steps);
            expect(result.success).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });

        it('handles empty dataset gracefully', () => {
            const steps = [createStep('remove_missing')];
            const result = executePipeline([], steps);
            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(0);
            expect(result.originalRowCount).toBe(0);
        });
    });

    describe('skipped steps', () => {
        it('skips disabled steps', () => {
            const data = makeRows([{ name: 'Alice' }, { name: null }]);
            const steps = [createStep('remove_missing', {}, false)];
            const result = executePipeline(data, steps);
            expect(result.stepResults[0].status).toBe('skipped');
            expect(result.data).toHaveLength(2);
        });
    });
});

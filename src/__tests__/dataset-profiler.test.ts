import { describe, it, expect } from 'vitest';
import { profileDataset, formatProfileSummary } from '../lib/dataset-profiler';

describe('Dataset Profiler', () => {
    describe('profileDataset', () => {
        it('should profile a simple numeric dataset', () => {
            const rows = [
                { name: 'Alice', age: 30, salary: 50000 },
                { name: 'Bob', age: 25, salary: 60000 },
                { name: 'Charlie', age: 35, salary: 70000 },
            ];
            const profile = profileDataset(rows, 'Test Dataset');

            expect(profile.datasetName).toBe('Test Dataset');
            expect(profile.rowCount).toBe(3);
            expect(profile.columnCount).toBe(3);
            expect(profile.columns).toHaveLength(3);
            expect(profile.quality.overallScore).toBeGreaterThan(0);
        });

        it('should handle empty dataset', () => {
            const profile = profileDataset([], 'Empty');
            expect(profile.rowCount).toBe(0);
            expect(profile.columnCount).toBe(0);
            expect(profile.columns).toHaveLength(0);
        });

        it('should handle single row', () => {
            const rows = [{ a: 1, b: 'hello' }];
            const profile = profileDataset(rows);
            expect(profile.rowCount).toBe(1);
            expect(profile.columnCount).toBe(2);
        });

        it('should detect numeric columns and calculate stats', () => {
            const rows = Array.from({ length: 100 }, (_, i) => ({
                value: i + 1,
            }));
            const profile = profileDataset(rows);

            const valueCol = profile.columns.find(c => c.name === 'value');
            expect(valueCol).toBeDefined();
            expect(valueCol?.detectedType).toBe('numeric');
            expect(valueCol?.numericStats).toBeDefined();
            expect(valueCol?.numericStats?.min).toBe(1);
            expect(valueCol?.numericStats?.max).toBe(100);
            expect(valueCol?.numericStats?.mean).toBe(50.5);
            expect(valueCol?.numericStats?.median).toBe(50.5);
        });

        it('should detect categorical columns', () => {
            const rows = [
                { color: 'red' },
                { color: 'blue' },
                { color: 'red' },
                { color: 'green' },
            ];
            const profile = profileDataset(rows);

            const colorCol = profile.columns.find(c => c.name === 'color');
            expect(colorCol).toBeDefined();
            expect(colorCol?.detectedType).toBe('categorical');
            expect(colorCol?.categoricalStats).toBeDefined();
            expect(colorCol?.categoricalStats?.uniqueCount).toBe(3);
        });

        it('should detect missing values', () => {
            const rows = [
                { name: 'Alice', age: 30 },
                { name: 'Bob', age: null },
                { name: null, age: 25 },
            ];
            const profile = profileDataset(rows);

            const nameCol = profile.columns.find(c => c.name === 'name');
            expect(nameCol?.missingCount).toBe(1);
            expect(nameCol?.missingPercentage).toBeCloseTo(33.3, 0);

            const ageCol = profile.columns.find(c => c.name === 'age');
            expect(ageCol?.missingCount).toBe(1);
        });

        it('should detect duplicate rows', () => {
            const rows = [
                { a: 1, b: 'x' },
                { a: 2, b: 'y' },
                { a: 1, b: 'x' }, // duplicate
            ];
            const profile = profileDataset(rows);
            expect(profile.duplicateRowCount).toBe(1);
        });

        it('should detect constant columns', () => {
            const rows = [
                { constant: 'same', value: 1 },
                { constant: 'same', value: 2 },
                { constant: 'same', value: 3 },
            ];
            const profile = profileDataset(rows);

            const constCol = profile.columns.find(c => c.name === 'constant');
            expect(constCol?.isConstant).toBe(true);
        });

        it('should detect identifier columns', () => {
            const rows = Array.from({ length: 50 }, (_, i) => ({
                id: i + 1,
                name: `user_${i}`,
            }));
            const profile = profileDataset(rows);

            const idCol = profile.columns.find(c => c.name === 'id');
            expect(idCol?.isIdentifier).toBe(true);
        });

        it('should calculate outliers using IQR method', () => {
            const rows = [
                { value: 10 },
                { value: 12 },
                { value: 11 },
                { value: 13 },
                { value: 12 },
                { value: 100 }, // outlier
            ];
            const profile = profileDataset(rows);

            const valueCol = profile.columns.find(c => c.name === 'value');
            expect(valueCol?.numericStats?.outlierCount).toBeGreaterThan(0);
        });

        it('should handle all-missing column', () => {
            const rows = [
                { empty: null, valid: 1 },
                { empty: null, valid: 2 },
            ];
            const profile = profileDataset(rows);

            const emptyCol = profile.columns.find(c => c.name === 'empty');
            expect(emptyCol?.missingPercentage).toBe(100);
            expect(emptyCol?.detectedType).toBe('unknown');
        });

        it('should handle mixed data types', () => {
            const rows = [
                { mixed: 'hello' },
                { mixed: '42' },
                { mixed: 'world' },
            ];
            const profile = profileDataset(rows);

            const mixedCol = profile.columns.find(c => c.name === 'mixed');
            expect(mixedCol).toBeDefined();
        });

        it('should calculate quality score', () => {
            const rows = Array.from({ length: 100 }, (_, i) => ({
                a: i,
                b: `item_${i}`,
            }));
            const profile = profileDataset(rows);

            expect(profile.quality.overallScore).toBe(100); // Perfect data
            expect(profile.quality.issues).toHaveLength(0);
        });

        it('should penalize quality for issues', () => {
            const rows = [
                { a: 1, b: 'x' },
                { a: 1, b: 'x' }, // duplicate
                { a: null, b: null }, // missing
            ];
            const profile = profileDataset(rows);

            expect(profile.quality.overallScore).toBeLessThan(100);
            expect(profile.quality.issues.length).toBeGreaterThan(0);
        });

        it('should sample large datasets', () => {
            const rows = Array.from({ length: 60000 }, (_, i) => ({
                id: i,
                value: Math.random(),
            }));
            const profile = profileDataset(rows);

            expect(profile.sampled).toBe(true);
            expect(profile.rowCount).toBeLessThanOrEqual(50000);
        });

        it('should not sample small datasets', () => {
            const rows = Array.from({ length: 100 }, (_, i) => ({ id: i }));
            const profile = profileDataset(rows);
            expect(profile.sampled).toBe(false);
            expect(profile.rowCount).toBe(100);
        });

        it('should estimate memory usage', () => {
            const rows = Array.from({ length: 1000 }, (_, i) => ({
                id: i,
                name: `user_${i}`,
                value: Math.random() * 1000,
            }));
            const profile = profileDataset(rows);
            expect(profile.memoryEstimateBytes).toBeGreaterThan(0);
        });

        it('should use default name when not provided', () => {
            const rows = [{ a: 1 }];
            const profile = profileDataset(rows);
            expect(profile.datasetName).toBe('Untitled Dataset');
        });
    });

    describe('formatProfileSummary', () => {
        it('should format profile summary as markdown', () => {
            const rows = [
                { name: 'Alice', age: 30 },
                { name: 'Bob', age: 25 },
            ];
            const profile = profileDataset(rows, 'People');
            const summary = formatProfileSummary(profile);

            expect(summary).toContain('## Dataset: People');
            expect(summary).toContain('Rows:');
            expect(summary).toContain('Columns:');
            expect(summary).toContain('Data Quality');
        });
    });

    describe('Edge cases', () => {
        it('should handle dataset with only null values', () => {
            const rows = [
                { a: null, b: null },
                { a: null, b: null },
            ];
            const profile = profileDataset(rows);
            expect(profile.rowCount).toBe(2);
            expect(profile.columns).toHaveLength(2);
        });

        it('should handle dataset with unicode data', () => {
            const rows = [
                { name: 'José', city: 'São Paulo' },
                { name: '田中', city: '東京' },
            ];
            const profile = profileDataset(rows);
            expect(profile.rowCount).toBe(2);
            expect(profile.columns).toHaveLength(2);
        });

        it('should handle boolean columns', () => {
            const rows = [
                { active: true },
                { active: false },
                { active: true },
            ];
            const profile = profileDataset(rows);
            const boolCol = profile.columns.find(c => c.name === 'active');
            expect(boolCol?.detectedType).toBe('boolean');
        });
    });
});

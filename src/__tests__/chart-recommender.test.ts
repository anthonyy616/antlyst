import { describe, it, expect } from 'vitest';
import { recommendCharts } from '../lib/chart-recommender';
import { analyzeColumns } from '../lib/column-validator';

describe('Chart Recommender', () => {
    describe('recommendCharts', () => {
        it('should return empty for empty dataset', () => {
            const result = recommendCharts([], {});
            expect(result.recommendations).toHaveLength(0);
            expect(result.summary).toContain('No data');
        });

        it('should recommend histogram for single numeric column', () => {
            const rows = Array.from({ length: 100 }, (_, i) => ({
                value: i + Math.random() * 10,
            }));
            const meta = analyzeColumns(rows);
            const result = recommendCharts(rows, meta);

            expect(result.recommendations.length).toBeGreaterThan(0);
            const histRec = result.recommendations.find(r => r.chartType === 'histogram');
            expect(histRec).toBeDefined();
            expect(histRec?.yColumn).toBe('value');
        });

        it('should recommend bar chart for categorical + numeric', () => {
            const rows = [
                { region: 'North', sales: 100 },
                { region: 'South', sales: 200 },
                { region: 'East', sales: 150 },
                { region: 'West', sales: 120 },
            ];
            const meta = analyzeColumns(rows);
            const result = recommendCharts(rows, meta);

            const barRec = result.recommendations.find(r => r.chartType === 'bar');
            expect(barRec).toBeDefined();
            expect(barRec?.category).toBe('comparison');
        });

        it('should recommend line chart for datetime + numeric', () => {
            const rows = Array.from({ length: 30 }, (_, i) => ({
                date: `2024-01-${String(i + 1).padStart(2, '0')}`,
                revenue: 1000 + i * 10 + Math.random() * 50,
            }));
            const meta = analyzeColumns(rows);
            const result = recommendCharts(rows, meta);

            const lineRec = result.recommendations.find(r => r.chartType === 'line');
            expect(lineRec).toBeDefined();
            expect(lineRec?.category).toBe('trend');
        });

        it('should recommend scatter for two numeric columns', () => {
            const rows = Array.from({ length: 50 }, (_, i) => ({
                x_val: i + Math.random() * 5,
                y_val: i * 2 + Math.random() * 10,
            }));
            const meta = analyzeColumns(rows);
            const result = recommendCharts(rows, meta);

            const scatterRec = result.recommendations.find(r => r.chartType === 'scatter');
            expect(scatterRec).toBeDefined();
            expect(scatterRec?.category).toBe('relationship');
        });

        it('should recommend pie chart for low-cardinality categorical', () => {
            const rows = [
                { status: 'active' },
                { status: 'active' },
                { status: 'inactive' },
                { status: 'pending' },
                { status: 'active' },
            ];
            const meta = analyzeColumns(rows);
            const result = recommendCharts(rows, meta);

            const pieRec = result.recommendations.find(r => r.chartType === 'pie');
            expect(pieRec).toBeDefined();
            expect(pieRec?.category).toBe('composition');
        });

        it('should respect maxRecommendations limit', () => {
            const rows = Array.from({ length: 50 }, (_, i) => ({
                date: `2024-01-${String(i + 1).padStart(2, '0')}`,
                value: i * 10,
                category: `cat_${i % 5}`,
                score: Math.random() * 100,
            }));
            const meta = analyzeColumns(rows);
            const result = recommendCharts(rows, meta, 3);

            expect(result.recommendations.length).toBeLessThanOrEqual(3);
        });

        it('should not recommend charts for identifier columns', () => {
            const rows = Array.from({ length: 50 }, (_, i) => ({
                id: i + 1,
                name: `item_${i}`,
            }));
            const meta = analyzeColumns(rows);
            const result = recommendCharts(rows, meta);

            // Should not have scatter with id as one of the axes
            for (const rec of result.recommendations) {
                expect(rec.xColumn).not.toBe('id');
                expect(rec.yColumn).not.toBe('id');
            }
        });

        it('should generate meaningful summaries', () => {
            const rows = Array.from({ length: 30 }, (_, i) => ({
                date: `2024-01-${String(i + 1).padStart(2, '0')}`,
                revenue: 1000 + i * 10,
                region: ['North', 'South', 'East', 'West'][i % 4],
            }));
            const meta = analyzeColumns(rows);
            const result = recommendCharts(rows, meta);

            expect(result.summary).toContain('recommendation');
            expect(result.summary).toContain('rows');
        });

        it('should assign confidence scores between 0 and 1', () => {
            const rows = Array.from({ length: 50 }, (_, i) => ({
                a: i,
                b: i * 2,
                c: `group_${i % 5}`,
            }));
            const meta = analyzeColumns(rows);
            const result = recommendCharts(rows, meta);

            for (const rec of result.recommendations) {
                expect(rec.confidence).toBeGreaterThan(0);
                expect(rec.confidence).toBeLessThanOrEqual(1);
            }
        });

        it('should not duplicate chart types for same columns', () => {
            const rows = Array.from({ length: 50 }, (_, i) => ({
                x: i,
                y: i * 2,
            }));
            const meta = analyzeColumns(rows);
            const result = recommendCharts(rows, meta);

            const keys = result.recommendations.map(r => `${r.chartType}:${r.xColumn}:${r.yColumn}`);
            const uniqueKeys = new Set(keys);
            expect(keys.length).toBe(uniqueKeys.size);
        });

        it('should include all required fields in recommendations', () => {
            const rows = Array.from({ length: 20 }, (_, i) => ({
                category: `cat_${i % 3}`,
                value: i * 10,
            }));
            const meta = analyzeColumns(rows);
            const result = recommendCharts(rows, meta);

            for (const rec of result.recommendations) {
                expect(rec.id).toBeDefined();
                expect(rec.chartType).toBeDefined();
                expect(rec.title).toBeDefined();
                expect(rec.description).toBeDefined();
                expect(rec.reason).toBeDefined();
                expect(rec.confidence).toBeGreaterThan(0);
                expect(rec.category).toBeDefined();
            }
        });

        it('should handle single-column dataset', () => {
            const rows = Array.from({ length: 20 }, (_, i) => ({
                count: i + 1,
            }));
            const meta = analyzeColumns(rows);
            const result = recommendCharts(rows, meta);

            // Should at least recommend a histogram
            expect(result.recommendations.length).toBeGreaterThan(0);
        });
    });
});

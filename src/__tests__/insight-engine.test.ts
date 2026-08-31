import { describe, it, expect } from 'vitest';
import { detectInsights, Insight, InsightResult } from '../lib/insight-engine';
import { profileDataset, DatasetProfile } from '../lib/dataset-profiler';

function makeRows(overrides: Record<string, any>[]): any[] {
    return overrides;
}

describe('insight-engine', () => {
    describe('detectInsights', () => {
        it('returns empty insights for empty dataset', () => {
            const result = detectInsights([]);
            expect(result.insights).toHaveLength(0);
            expect(result.summary).toContain('No data');
        });

        it('generates summary insight for any dataset', () => {
            const rows = makeRows([
                { name: 'Alice', age: 30 },
                { name: 'Bob', age: 25 },
                { name: 'Charlie', age: 35 },
            ]);
            const result = detectInsights(rows);
            const summary = result.insights.find(i => i.type === 'summary');
            expect(summary).toBeDefined();
            expect(summary!.title).toBe('Dataset Overview');
        });

        it('detects outliers in numeric data', () => {
            const rows = makeRows(
                Array.from({ length: 100 }, (_, i) => ({
                    value: i < 95 ? Math.random() * 10 : 1000,
                }))
            );
            const result = detectInsights(rows);
            const outliers = result.insights.filter(i => i.type === 'outlier');
            expect(outliers.length).toBeGreaterThanOrEqual(1);
            expect(outliers[0].relevantColumns).toContain('value');
        });

        it('detects strong positive correlations', () => {
            const rows = makeRows(
                Array.from({ length: 50 }, (_, i) => ({
                    x: i,
                    y: i * 2 + Math.random() * 0.1,
                }))
            );
            const result = detectInsights(rows);
            const correlations = result.insights.filter(i => i.type === 'correlation');
            expect(correlations.length).toBeGreaterThanOrEqual(1);
            expect(correlations[0].confidence).toBeGreaterThan(0.6);
        });

        it('detects weak/no correlations', () => {
            const rows = makeRows(
                Array.from({ length: 50 }, () => ({
                    x: Math.random() * 100,
                    y: Math.random() * 100,
                }))
            );
            const result = detectInsights(rows);
            const correlations = result.insights.filter(i => i.type === 'correlation');
            expect(correlations).toHaveLength(0);
        });

        it('detects upward trends', () => {
            const rows = makeRows(
                Array.from({ length: 100 }, (_, i) => ({
                    revenue: 100 + i * 10 + Math.random() * 5,
                }))
            );
            const result = detectInsights(rows);
            const trends = result.insights.filter(i => i.type === 'trend');
            expect(trends.length).toBeGreaterThanOrEqual(1);
            expect(trends[0].finding.toLowerCase()).toContain('increased');
        });

        it('detects downward trends', () => {
            const rows = makeRows(
                Array.from({ length: 100 }, (_, i) => ({
                    revenue: 1000 - i * 10 + Math.random() * 5,
                }))
            );
            const result = detectInsights(rows);
            const trends = result.insights.filter(i => i.type === 'trend');
            expect(trends.length).toBeGreaterThanOrEqual(1);
            expect(trends[0].finding.toLowerCase()).toContain('decreased');
        });

        it('detects group differences', () => {
            const rows = makeRows([
                ...Array.from({ length: 20 }, () => ({ category: 'A', score: 90 + Math.random() * 10 })),
                ...Array.from({ length: 20 }, () => ({ category: 'B', score: 30 + Math.random() * 10 })),
            ]);
            const result = detectInsights(rows);
            const groups = result.insights.filter(i => i.type === 'group_difference');
            expect(groups.length).toBeGreaterThanOrEqual(1);
        });

        it('detects highly skewed distributions', () => {
            const rows = makeRows(
                Array.from({ length: 200 }, (_, i) => ({
                    income: i < 190 ? 30000 + Math.random() * 20000 : 500000 + Math.random() * 200000,
                }))
            );
            const result = detectInsights(rows);
            const distributions = result.insights.filter(i => i.type === 'distribution');
            expect(distributions.length).toBeGreaterThanOrEqual(1);
        });

        it('respects maxInsights limit', () => {
            const rows = makeRows(
                Array.from({ length: 100 }, (_, i) => ({
                    a: i, b: i * 2, c: i * 3,
                }))
            );
            const result = detectInsights(rows, undefined, 3);
            expect(result.insights.length).toBeLessThanOrEqual(3);
        });

        it('uses pre-computed profile when provided', () => {
            const rows = makeRows([
                { name: 'Alice', age: 30 },
                { name: 'Bob', age: 25 },
            ]);
            const profile = profileDataset(rows, 'Test');
            const result = detectInsights(rows, profile);
            expect(result.insights.length).toBeGreaterThan(0);
        });

        it('all insights have required fields', () => {
            const rows = makeRows(
                Array.from({ length: 50 }, (_, i) => ({
                    x: i, y: i * 2,
                }))
            );
            const result = detectInsights(rows);
            for (const insight of result.insights) {
                expect(insight.id).toBeTruthy();
                expect(insight.type).toBeTruthy();
                expect(['low', 'medium', 'high']).toContain(insight.severity);
                expect(insight.confidence).toBeGreaterThanOrEqual(0);
                expect(insight.confidence).toBeLessThanOrEqual(1);
                expect(insight.title).toBeTruthy();
                expect(insight.finding).toBeTruthy();
                expect(insight.evidence).toBeTruthy();
                expect(insight.relevantColumns.length).toBeGreaterThan(0);
                expect(insight.timestamp).toBeTruthy();
            }
        });

        it('insights are ranked by severity * confidence', () => {
            const rows = makeRows(
                Array.from({ length: 100 }, (_, i) => ({
                    x: i, y: i * 2,
                }))
            );
            const result = detectInsights(rows);
            const severityWeight = { high: 3, medium: 2, low: 1 };
            for (let i = 1; i < result.insights.length; i++) {
                const prev = result.insights[i - 1];
                const curr = result.insights[i];
                const prevScore = prev.confidence * severityWeight[prev.severity];
                const currScore = curr.confidence * severityWeight[curr.severity];
                expect(prevScore).toBeGreaterThanOrEqual(currScore);
            }
        });

        it('summary text is generated', () => {
            const rows = makeRows(
                Array.from({ length: 30 }, (_, i) => ({
                    x: i, y: i * 2,
                }))
            );
            const result = detectInsights(rows);
            expect(result.summary).toBeTruthy();
            expect(result.summary.length).toBeGreaterThan(10);
        });

        it('handles seasonal-like data without crashing', () => {
            const rows = makeRows(
                Array.from({ length: 200 }, (_, i) => ({
                    month: i % 12,
                    value: 50 + 30 * Math.sin((i / 12) * 2 * Math.PI) + Math.random() * 5,
                }))
            );
            const result = detectInsights(rows);
            expect(result.insights.length).toBeGreaterThan(0);
            expect(result.generatedAt).toBeTruthy();
        });
    });
});

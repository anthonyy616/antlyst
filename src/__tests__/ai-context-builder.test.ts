import { describe, it, expect } from 'vitest';
import {
    buildDatasetContext,
    buildChartContext,
    buildQuestionContext,
    buildSystemPrompt,
    buildUserMessage,
} from '../lib/ai-context-builder';
import { profileDataset } from '../lib/dataset-profiler';

describe('AI Context Builder', () => {
    const sampleRows = [
        { name: 'Alice', age: 30, salary: 50000, department: 'Engineering' },
        { name: 'Bob', age: 25, salary: 60000, department: 'Marketing' },
        { name: 'Charlie', age: 35, salary: 70000, department: 'Engineering' },
        { name: 'Diana', age: 28, salary: 55000, department: 'Marketing' },
    ];

    const profile = profileDataset(sampleRows, 'Employees');

    describe('buildDatasetContext', () => {
        it('should create context with dataset info', () => {
            const context = buildDatasetContext(profile, 'Employees');

            expect(context.dataset.name).toBe('Employees');
            expect(context.dataset.rowCount).toBe(4);
            expect(context.dataset.columnCount).toBe(4);
            expect(context.dataset.columns).toContain('name');
            expect(context.dataset.columns).toContain('age');
        });

        it('should include column types', () => {
            const context = buildDatasetContext(profile);

            expect(context.dataset.columnTypes).toBeDefined();
            expect(typeof context.dataset.columnTypes.name).toBe('string');
        });

        it('should include column statistics', () => {
            const context = buildDatasetContext(profile);

            expect(context.columns.length).toBe(4);

            const ageCol = context.columns.find(c => c.name === 'age');
            expect(ageCol).toBeDefined();
            expect(ageCol?.type).toBe('numeric');
            expect(ageCol?.stats).toContain('Range');
        });

        it('should include quality info', () => {
            const context = buildDatasetContext(profile);

            expect(context.quality.score).toBeGreaterThanOrEqual(0);
            expect(context.quality.score).toBeLessThanOrEqual(100);
            expect(Array.isArray(context.quality.issues)).toBe(true);
        });

        it('should use default name when not provided', () => {
            const context = buildDatasetContext(profile);
            expect(context.dataset.name).toBe('Employees'); // From profile
        });
    });

    describe('buildChartContext', () => {
        it('should include chart metadata', () => {
            const context = buildChartContext(
                profile,
                'bar',
                'Salary by Department',
                'department',
                'salary'
            );

            expect(context.chartContext).toBeDefined();
            expect(context.chartContext?.chartType).toBe('bar');
            expect(context.chartContext?.title).toBe('Salary by Department');
            expect(context.chartContext?.xColumn).toBe('department');
            expect(context.chartContext?.yColumn).toBe('salary');
        });

        it('should include base dataset context', () => {
            const context = buildChartContext(profile, 'line', 'Trend', 'age', 'salary');

            expect(context.dataset.rowCount).toBe(4);
            expect(context.columns.length).toBe(4);
        });

        it('should summarize chart data when provided', () => {
            const chartData = [
                { x: 'Engineering', y: 60000 },
                { x: 'Marketing', y: 57500 },
            ];

            const context = buildChartContext(
                profile,
                'bar',
                'Avg Salary',
                'department',
                'salary',
                chartData
            );

            expect(context.chartContext?.dataSummary).toContain('Chart data');
        });
    });

    describe('buildQuestionContext', () => {
        it('should create context for a question', () => {
            const context = buildQuestionContext(profile, 'What is the average age?');

            expect(context.dataset.rowCount).toBe(4);
            expect(context.columns.length).toBe(4);
        });

        it('should identify mentioned columns', () => {
            const context = buildQuestionContext(profile, 'Show me the salary distribution');

            const salaryCol = context.columns.find(c => c.name === 'salary');
            expect(salaryCol).toBeDefined();
        });
    });

    describe('buildSystemPrompt', () => {
        it('should return a non-empty system prompt', () => {
            const prompt = buildSystemPrompt();
            expect(prompt.length).toBeGreaterThan(100);
            expect(prompt).toContain('data analyst');
            expect(prompt).toContain('facts');
        });

        it('should include hallucination prevention guidance', () => {
            const prompt = buildSystemPrompt();
            expect(prompt).toContain('assumptions');
            expect(prompt).toContain('speculation');
        });
    });

    describe('buildUserMessage', () => {
        it('should format context and question', () => {
            const context = buildDatasetContext(profile, 'Test');
            const message = buildUserMessage(context, 'What are the trends?');

            expect(message).toContain('Dataset: Test');
            expect(message).toContain('Question');
            expect(message).toContain('What are the trends?');
        });

        it('should include column stats', () => {
            const context = buildDatasetContext(profile);
            const message = buildUserMessage(context, 'Tell me about age');

            expect(message).toContain('age');
        });

        it('should include chart context when present', () => {
            const context = buildChartContext(profile, 'bar', 'Test Chart', 'name', 'age');
            const message = buildUserMessage(context, 'Explain this chart');

            expect(message).toContain('Current Chart');
            expect(message).toContain('bar');
        });
    });
});

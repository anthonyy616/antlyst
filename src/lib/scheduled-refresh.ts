import { prisma } from './prisma';

export type RefreshSchedule = 'manual' | 'hourly' | 'daily' | 'weekly' | 'monthly';

/**
 * Calculate the next refresh time based on schedule.
 */
export function getNextRefreshTime(schedule: RefreshSchedule, from: Date = new Date()): Date | null {
    if (schedule === 'manual') return null;

    const next = new Date(from);
    switch (schedule) {
        case 'hourly':
            next.setHours(next.getHours() + 1);
            break;
        case 'daily':
            next.setDate(next.getDate() + 1);
            next.setHours(6, 0, 0, 0); // 6 AM
            break;
        case 'weekly':
            next.setDate(next.getDate() + 7);
            next.setHours(6, 0, 0, 0);
            break;
        case 'monthly':
            next.setMonth(next.getMonth() + 1);
            next.setDate(1);
            next.setHours(6, 0, 0, 0);
            break;
    }
    return next;
}

/**
 * Update the refresh schedule for a data source.
 */
export async function setRefreshSchedule(
    dataSourceId: string,
    schedule: RefreshSchedule
): Promise<void> {
    const nextRefreshAt = getNextRefreshTime(schedule);

    await prisma.dataSource.update({
        where: { id: dataSourceId },
        data: {
            refreshSchedule: schedule,
            nextRefreshAt,
        },
    });
}

/**
 * Find all data sources that need refreshing.
 */
export async function getDueRefreshes(): Promise<any[]> {
    const now = new Date();
    return prisma.dataSource.findMany({
        where: {
            refreshSchedule: { not: 'manual' },
            nextRefreshAt: { lte: now },
            status: { notIn: ['fetching', 'processing'] },
        },
        include: { project: true },
    });
}

/**
 * Compare two schemas and detect changes.
 */
export function compareSchemas(
    oldSchema: Record<string, string>,
    newSchema: Record<string, string>
): {
    added: string[];
    removed: string[];
    changed: { column: string; from: string; to: string }[];
} {
    const oldKeys = new Set(Object.keys(oldSchema));
    const newKeys = new Set(Object.keys(newSchema));

    const added = [...newKeys].filter(k => !oldKeys.has(k));
    const removed = [...oldKeys].filter(k => !newKeys.has(k));
    const changed: { column: string; from: string; to: string }[] = [];

    for (const key of newKeys) {
        if (oldKeys.has(key) && oldSchema[key] !== newSchema[key]) {
            changed.push({ column: key, from: oldSchema[key], to: newSchema[key] });
        }
    }

    return { added, removed, changed };
}

/**
 * Record a dataset version after a refresh.
 */
export async function recordDatasetVersion(
    dataSourceId: string,
    fileId: string,
    rowCount: number,
    columnCount: number,
    schema: Record<string, string>,
    previousSchema?: Record<string, string>
): Promise<{ version: number; schemaChanged: boolean; changes: any }> {
    // Get the latest version number
    const latest = await prisma.datasetVersion.findFirst({
        where: { dataSourceId },
        orderBy: { version: 'desc' },
        select: { version: true },
    });

    const newVersion = (latest?.version || 0) + 1;

    // Compare schemas if we have a previous one
    let changeSummary = null;
    let schemaChanged = false;
    if (previousSchema) {
        const changes = compareSchemas(previousSchema, schema);
        schemaChanged = changes.added.length > 0 || changes.removed.length > 0 || changes.changed.length > 0;
        changeSummary = changes;
    }

    await prisma.datasetVersion.create({
        data: {
            dataSourceId,
            version: newVersion,
            fileId,
            rowCount,
            columnCount,
            schema,
            changeSummary: changeSummary || undefined,
        },
    });

    return { version: newVersion, schemaChanged, changes: changeSummary };
}

/**
 * Execute a refresh for a data source.
 * Returns the result status.
 */
export async function executeRefresh(dataSourceId: string): Promise<{
    success: boolean;
    status: 'success' | 'failed' | 'schema_changed';
    error?: string;
}> {
    const dataSource = await prisma.dataSource.findUnique({
        where: { id: dataSourceId },
        include: { project: true },
    });

    if (!dataSource) {
        return { success: false, status: 'failed', error: 'Data source not found' };
    }

    // Prevent concurrent refreshes
    if (dataSource.status === 'fetching' || dataSource.status === 'processing') {
        return { success: false, status: 'failed', error: 'Refresh already in progress' };
    }

    // Get previous schema for comparison
    const latestVersion = await prisma.datasetVersion.findFirst({
        where: { dataSourceId },
        orderBy: { version: 'desc' },
    });
    const previousSchema = (latestVersion?.schema as Record<string, string>) || undefined;

    try {
        // Update status to fetching
        await prisma.dataSource.update({
            where: { id: dataSourceId },
            data: { status: 'fetching', lastRefreshError: null },
        });

        // Trigger the background fetch (reuse existing infrastructure)
        const { fetchDataInBackground } = await import('./background-fetch');
        const result = await fetchDataInBackground(dataSourceId, dataSource.type, (dataSource.config as Record<string, string>) || {});

        // Determine status
        let status: 'success' | 'failed' | 'schema_changed' = result.success ? 'success' : 'failed';

        // Update data source
        const nextRefreshAt = dataSource.refreshSchedule
            ? getNextRefreshTime(dataSource.refreshSchedule as RefreshSchedule)
            : null;

        await prisma.dataSource.update({
            where: { id: dataSourceId },
            data: {
                status: 'ready',
                lastSyncAt: new Date(),
                lastRefreshStatus: status,
                refreshCount: { increment: 1 },
                nextRefreshAt,
            },
        });

        return { success: true, status };
    } catch (error: any) {
        await prisma.dataSource.update({
            where: { id: dataSourceId },
            data: {
                status: 'error',
                lastRefreshStatus: 'failed',
                lastRefreshError: error.message,
            },
        });

        return { success: false, status: 'failed', error: error.message };
    }
}

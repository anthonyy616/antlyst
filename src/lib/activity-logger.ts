import { prisma } from './prisma';

export type ActivityAction =
    | 'created'
    | 'updated'
    | 'deleted'
    | 'shared'
    | 'unshared'
    | 'commented'
    | 'duplicated'
    | 'filter_applied'
    | 'exported';

interface LogActivityParams {
    dashboardId?: string | null;
    userId: string;
    action: ActivityAction;
    details?: Record<string, any>;
}

/**
 * Log an activity event for a dashboard.
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
    try {
        await prisma.activityLog.create({
            data: {
                dashboardId: params.dashboardId || null,
                userId: params.userId,
                action: params.action,
                details: params.details || {},
            },
        });
    } catch (error) {
        // Activity logging should never block the main operation
        console.error('Failed to log activity:', error);
    }
}

/**
 * Get recent activity for a project's dashboards.
 */
export async function getProjectActivity(
    projectId: string,
    limit: number = 50
) {
    return prisma.activityLog.findMany({
        where: {
            dashboard: { projectId },
        },
        include: {
            user: { select: { id: true, name: true, email: true, imageUrl: true } },
            dashboard: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
    });
}

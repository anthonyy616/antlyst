import { prisma } from './prisma';

export type DashboardPermission = 'owner' | 'edit' | 'view' | 'none';

export interface DashboardAccess {
    permission: DashboardPermission;
    dashboardId: string;
    userId: string;
}

/**
 * Check what permission a user has on a dashboard.
 */
export async function getDashboardAccess(
    userId: string,
    dashboardId: string
): Promise<DashboardAccess> {
    const dashboard = await prisma.dashboard.findUnique({
        where: { id: dashboardId },
        select: { ownerId: true, isPublic: true },
    });

    if (!dashboard) {
        return { permission: 'none', dashboardId, userId };
    }

    if (dashboard.ownerId === userId) {
        return { permission: 'owner', dashboardId, userId };
    }

    const share = await prisma.dashboardShare.findUnique({
        where: {
            dashboardId_userId: { dashboardId, userId },
        },
        select: { permission: true },
    });

    if (share) {
        return { permission: share.permission as 'edit' | 'view', dashboardId, userId };
    }

    if (dashboard.isPublic) {
        return { permission: 'view', dashboardId, userId };
    }

    return { permission: 'none', dashboardId, userId };
}

/**
 * Check if user can edit a dashboard.
 */
export async function canEditDashboard(
    userId: string,
    dashboardId: string
): Promise<boolean> {
    const access = await getDashboardAccess(userId, dashboardId);
    return access.permission === 'owner' || access.permission === 'edit';
}

/**
 * Check if user can view a dashboard.
 */
export async function canViewDashboard(
    userId: string,
    dashboardId: string
): Promise<boolean> {
    const access = await getDashboardAccess(userId, dashboardId);
    return access.permission !== 'none';
}

/**
 * Check if user is the owner of a dashboard.
 */
export async function isDashboardOwner(
    userId: string,
    dashboardId: string
): Promise<boolean> {
    const access = await getDashboardAccess(userId, dashboardId);
    return access.permission === 'owner';
}

import { prisma } from './prisma';

export type OrgRole = 'owner' | 'admin' | 'editor' | 'viewer';

export type Permission =
    | 'org:manage'
    | 'org:members:manage'
    | 'project:create'
    | 'project:edit'
    | 'project:delete'
    | 'project:view'
    | 'dashboard:create'
    | 'dashboard:edit'
    | 'dashboard:delete'
    | 'dashboard:view'
    | 'dashboard:share'
    | 'dataset:upload'
    | 'dataset:edit'
    | 'dataset:delete'
    | 'dataset:view'
    | 'comment:create'
    | 'comment:delete'
    | 'activity:view';

const ROLE_PERMISSIONS: Record<OrgRole, Permission[]> = {
    owner: [
        'org:manage',
        'org:members:manage',
        'project:create', 'project:edit', 'project:delete', 'project:view',
        'dashboard:create', 'dashboard:edit', 'dashboard:delete', 'dashboard:view', 'dashboard:share',
        'dataset:upload', 'dataset:edit', 'dataset:delete', 'dataset:view',
        'comment:create', 'comment:delete',
        'activity:view',
    ],
    admin: [
        'org:members:manage',
        'project:create', 'project:edit', 'project:delete', 'project:view',
        'dashboard:create', 'dashboard:edit', 'dashboard:delete', 'dashboard:view', 'dashboard:share',
        'dataset:upload', 'dataset:edit', 'dataset:delete', 'dataset:view',
        'comment:create', 'comment:delete',
        'activity:view',
    ],
    editor: [
        'project:view',
        'dashboard:create', 'dashboard:edit', 'dashboard:view', 'dashboard:share',
        'dataset:upload', 'dataset:edit', 'dataset:view',
        'comment:create',
        'activity:view',
    ],
    viewer: [
        'project:view',
        'dashboard:view',
        'dataset:view',
        'comment:create',
        'activity:view',
    ],
};

/**
 * Get the role of a user in an organization.
 */
export async function getUserOrgRole(
    userId: string,
    organizationId: string
): Promise<OrgRole | null> {
    const membership = await prisma.orgMembership.findUnique({
        where: {
            userId_organizationId: { userId, organizationId },
        },
        select: { role: true },
    });

    return membership ? (membership.role as OrgRole) : null;
}

/**
 * Get all permissions for a user in an organization.
 */
export async function getUserPermissions(
    userId: string,
    organizationId: string
): Promise<Permission[]> {
    const role = await getUserOrgRole(userId, organizationId);
    if (!role) return [];
    return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if a user has a specific permission in an organization.
 */
export async function hasPermission(
    userId: string,
    organizationId: string,
    permission: Permission
): Promise<boolean> {
    const permissions = await getUserPermissions(userId, organizationId);
    return permissions.includes(permission);
}

/**
 * Check if a user has any of the specified permissions.
 */
export async function hasAnyPermission(
    userId: string,
    organizationId: string,
    permissions: Permission[]
): Promise<boolean> {
    const userPermissions = await getUserPermissions(userId, organizationId);
    return permissions.some(p => userPermissions.includes(p));
}

/**
 * Require a specific permission or throw.
 */
export async function requirePermission(
    userId: string,
    organizationId: string,
    permission: Permission
): Promise<void> {
    const has = await hasPermission(userId, organizationId, permission);
    if (!has) {
        throw new Error(`Permission denied: ${permission} required`);
    }
}

/**
 * Get all members of an organization with their roles.
 */
export async function getOrgMembers(organizationId: string) {
    return prisma.orgMembership.findMany({
        where: { organizationId },
        include: {
            user: {
                select: { id: true, name: true, email: true, imageUrl: true },
            },
        },
        orderBy: { createdAt: 'asc' },
    });
}

/**
 * Update a member's role in an organization.
 */
export async function updateMemberRole(
    organizationId: string,
    userId: string,
    newRole: OrgRole,
    performedBy: string
): Promise<void> {
    // Verify the performer has permission
    const performerRole = await getUserOrgRole(performedBy, organizationId);
    if (!performerRole || (performerRole !== 'owner' && performerRole !== 'admin')) {
        throw new Error('Insufficient permissions to change member roles');
    }

    // Owners can't be demoted by admins
    const targetRole = await getUserOrgRole(userId, organizationId);
    if (targetRole === 'owner' && performerRole !== 'owner') {
        throw new Error('Only the owner can change the owner role');
    }

    await prisma.orgMembership.update({
        where: {
            userId_organizationId: { userId, organizationId },
        },
        data: { role: newRole },
    });
}

/**
 * Remove a member from an organization.
 */
export async function removeMember(
    organizationId: string,
    userId: string,
    performedBy: string
): Promise<void> {
    const performerRole = await getUserOrgRole(performedBy, organizationId);
    if (!performerRole || (performerRole !== 'owner' && performerRole !== 'admin')) {
        throw new Error('Insufficient permissions to remove members');
    }

    const targetRole = await getUserOrgRole(userId, organizationId);
    if (targetRole === 'owner') {
        throw new Error('Cannot remove the organization owner');
    }

    await prisma.orgMembership.delete({
        where: {
            userId_organizationId: { userId, organizationId },
        },
    });
}

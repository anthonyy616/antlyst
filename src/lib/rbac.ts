import { prisma } from "./prisma";

export type UserRole = "ADMIN" | "MEMBER";

/**
 * Check if a user has a specific role in an organization.
 * @param userId - clerk user id
 * @param organizationId - organization id
 * @param allowedRoles - array of roles that are allowed
 * @returns boolean
 */
export async function checkRole(
    userId: string,
    organizationId: string,
    allowedRoles: UserRole[] = ["ADMIN"]
): Promise<boolean> {
    const membership = await prisma.orgMembership.findUnique({
        where: {
            userId_organizationId: {
                userId,
                organizationId,
            },
        },
    });

    if (!membership) return false;

    // Assuming role in database matches UserRole type
    return allowedRoles.includes(membership.role as UserRole);
}

/**
 * Simple middleware-like check that throws if user doesn't have role
 */
export async function ensureRole(
    userId: string,
    organizationId: string,
    allowedRoles: UserRole[] = ["ADMIN"]
) {
    const hasRole = await checkRole(userId, organizationId, allowedRoles);
    if (!hasRole) {
        throw new Error("Unauthorized: Insufficient permissions");
    }
}

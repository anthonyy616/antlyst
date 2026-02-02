import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';

export class OrgService {
    // Limits
    private static MAX_INVITES_PER_USER = 2;
    private static MAX_MEMBERS_PER_ORG = 5;
    private static MAX_ORGS_PER_USER = 2;

    /**
     * Create a new organization and set the creator as owner
     * Ensures user exists in DB before creating organization.
     */
    static async createOrganization(userId: string, name: string, userDetails?: { email: string, name?: string, imageUrl?: string }) {
        // 0. Ensure User Exists (Critical Fix for FK Constraint)
        // If user is missing in our DB (webhook failed/delayed), create them now.
        const userExists = await prisma.user.findUnique({ where: { id: userId } });
        if (!userExists) {
            if (!userDetails?.email) {
                // Even if we don't have email, we MUST create the user to satisfy FK.
                // We'll use a placeholder or partial data. Ideally caller provides it.
                console.warn(`User ${userId} missing in DB during Org Creation. Creating placeholder.`);
            }

            await prisma.user.create({
                data: {
                    id: userId,
                    email: userDetails?.email || `user_${userId}@placeholder.com`,
                    name: userDetails?.name,
                    imageUrl: userDetails?.imageUrl
                }
            });
        }

        // 1. Check Max Orgs Limit
        const userOrgsCount = await prisma.orgMembership.count({
            where: { userId, role: 'owner' }
        });

        // Admin Bypass
        const ADMIN_ID = 'user_35jevq93WOfUd9L3wGw94mFDoXF';

        if (userId !== ADMIN_ID && userOrgsCount >= this.MAX_ORGS_PER_USER) {
            throw new Error(`Limit reached: You can only create ${this.MAX_ORGS_PER_USER} organizations.`);
        }

        const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + randomBytes(2).toString('hex');
        const joinCode = randomBytes(4).toString('hex').toUpperCase(); // 8 char hex string

        // Transaction to create org and membership
        return await prisma.$transaction(async (tx) => {
            const org = await tx.organization.create({
                data: {
                    name,
                    slug,
                    joinCode,
                }
            });

            await tx.orgMembership.create({
                data: {
                    userId,
                    organizationId: org.id,
                    role: 'owner',
                }
            });

            return org;
        });
    }

    /**
     * Join an organization via 8-digit code
     * Ensures user exists.
     */
    static async joinViaCode(userId: string, code: string, userDetails?: { email: string, name?: string, imageUrl?: string }) {
        // 0. Ensure User Exists
        const userExists = await prisma.user.findUnique({ where: { id: userId } });
        if (!userExists) {
            await prisma.user.create({
                data: {
                    id: userId,
                    email: userDetails?.email || `user_${userId}@placeholder.com`,
                    name: userDetails?.name,
                    imageUrl: userDetails?.imageUrl
                }
            });
        }

        const org = await prisma.organization.findUnique({
            where: { joinCode: code }
        });

        if (!org) {
            throw new Error("Invalid join code.");
        }

        // Check if already a member
        const existingMember = await prisma.orgMembership.findUnique({
            where: {
                userId_organizationId: {
                    userId,
                    organizationId: org.id
                }
            }
        });

        if (existingMember) {
            return { success: true, organization: org, message: 'Already a member' };
        }

        // Check 5 Members Limit
        const memberCount = await prisma.orgMembership.count({
            where: { organizationId: org.id }
        });

        if (memberCount >= this.MAX_MEMBERS_PER_ORG) {
            throw new Error("This organization has reached its member limit (5 members).");
        }

        // Add Member
        const membership = await prisma.orgMembership.create({
            data: {
                userId,
                organizationId: org.id,
                role: 'member'
            }
        });

        // Notify all members
        await this.notifyAllMembers(prisma, org.id, 'New Member', `A new member has joined ${org.name}!`, userId);

        return { success: true, organization: org };
    }

    /**
     * Generate an invite link
     * Checks: Limit 2 active invites per creator
     */
    static async createInvite(userId: string, organizationId: string) {
        // 1. Check if user is admin/owner
        const membership = await prisma.orgMembership.findUnique({
            where: { userId_organizationId: { userId, organizationId } }
        });

        if (!membership || !['owner', 'admin'].includes(membership.role)) {
            throw new Error('Unauthorized');
        }

        // 2. Check limits (active active invites created by this user)
        const activeInvitesCount = await prisma.orgInviteLink.count({
            where: {
                creatorId: userId,
                organizationId,
                isRevoked: false,
                expiresAt: { gt: new Date() }
            }
        });

        if (activeInvitesCount >= this.MAX_INVITES_PER_USER) {
            throw new Error(`Invite limit reached (${this.MAX_INVITES_PER_USER} per user)`);
        }

        // 3. Create Invite
        const token = randomBytes(16).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

        return await prisma.orgInviteLink.create({
            data: {
                token,
                organizationId,
                creatorId: userId,
                expiresAt,
            }
        });
    }

    /**
     * Process a user joining via invite link
     * Checks: Org member limit (5)
     */
    static async joinViaInvite(userId: string, token: string) {
        return await prisma.$transaction(async (tx) => {
            // 1. Validate Invite
            const invite = await tx.orgInviteLink.findUnique({
                where: { token },
                include: { organization: true }
            });

            if (!invite) throw new Error('Invalid invite');
            if (invite.isRevoked) throw new Error('Invite revoked');
            if (invite.expiresAt < new Date()) throw new Error('Invite expired');
            if (invite.uses >= invite.maxUses) throw new Error('Invite max uses reached');

            // 2. Check if already member
            const existingMember = await tx.orgMembership.findUnique({
                where: { userId_organizationId: { userId, organizationId: invite.organizationId } }
            });

            if (existingMember) {
                return { success: true, message: 'Already a member' };
            }

            // 3. Check Org Limits
            const memberCount = await tx.orgMembership.count({
                where: { organizationId: invite.organizationId }
            });

            if (memberCount >= this.MAX_MEMBERS_PER_ORG) {
                // Notify owner (implementation placeholder)
                await this.notifyOwner(tx, invite.organizationId, `Org limit reached. User ${userId} tried to join via invite.`);
                throw new Error('Organization is full');
            }

            // 4. Create Membership
            await tx.orgMembership.create({
                data: {
                    userId,
                    organizationId: invite.organizationId,
                    role: 'member'
                }
            });

            // Notify all members
            // Need to fetch org name for nice message, or just generic.
            const orgName = invite.organization.name;
            await this.notifyAllMembers(tx, invite.organizationId, 'New Member', `A new member has joined ${orgName}!`, userId);

            // 5. Update Invite
            await tx.orgInviteLink.update({
                where: { id: invite.id },
                data: { uses: { increment: 1 } }
            });

            return { success: true, organizationId: invite.organizationId };
        });
    }

    /**
     * Delete an organization and all associated data
     */
    static async deleteOrganization(userId: string, orgId: string) {
        // 1. Verify Owner
        const membership = await prisma.orgMembership.findUnique({
            where: { userId_organizationId: { userId, organizationId: orgId } }
        });

        if (!membership || membership.role !== 'owner') {
            throw new Error('Unauthorized: Only owners can delete the organization');
        }

        // 2. Delete (Cascade should handle most, but explicit is safer for some relations)
        // Prisma transaction
        return await prisma.$transaction(async (tx) => {
            // Delete all notifications related to this org's activity could be tricky if they aren't linked to orgId directly.
            // Assuming notifications are user-based. We might leave them or they might be hard to trace.
            // For now, allow Prisma cascade for Project -> Dashboard etc.

            // Delete Memberships
            await tx.orgMembership.deleteMany({
                where: { organizationId: orgId }
            });

            // Delete Invites
            await tx.orgInviteLink.deleteMany({
                where: { organizationId: orgId }
            });

            // Delete Projects (will cascade files etc if schema configured, otherwise we need manual)
            // Assuming schema has cascade on delete. If not, this might fail. 
            // Let's rely on Prisma schema or simple delete of Org.

            // Delete Org (Cascades should be set up in Schema)
            await tx.organization.delete({
                where: { id: orgId }
            });
        });
    }

    private static async notifyAllMembers(tx: any, orgId: string, title: string, message: string, excludeUserId?: string) {
        const members = await tx.orgMembership.findMany({
            where: {
                organizationId: orgId,
                userId: { not: excludeUserId }
            },
            select: { userId: true }
        });

        if (members.length === 0) return;

        await tx.notification.createMany({
            data: members.map((m: any) => ({
                userId: m.userId,
                title,
                message,
                type: 'info'
            }))
        });
    }

    // ... (modify join functions below via multi_replace or manual edit if too complex)
    // Actually, I'll add the new helper method and `deleteOrganization` here, 
    // and I'll use separate replacement blocks/calls for the join functions to keep context clear.
    // Since I can't do multiple discontinuous edits easily without `multi_replace`, I'll start by adding these methods at the end of the class.

    // Wait, I am replacing the END of the file. I should verify if `notifyOwner` is at the end. Yes it is.

    private static async notifyOwner(tx: any, orgId: string, message: string) {
        // Find owner
        const owner = await tx.orgMembership.findFirst({
            where: { organizationId: orgId, role: 'owner' }
        });

        if (owner) {
            await tx.notification.create({
                data: {
                    userId: owner.userId,
                    title: 'Organization Limit Alert',
                    message,
                    type: 'warning'
                }
            });
        }
    }
}

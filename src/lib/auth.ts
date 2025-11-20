import { auth, clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

/**
 * Get current user + org, redirect if not authenticated
 */
export async function requireAuth() {
  const { userId, orgId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  return { userId, orgId: orgId || null };
}

/**
 * Get current organization ID or redirect
 */
export async function requireOrg() {
  const { userId, orgId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  if (!orgId) {
    // User not in an org, redirect to org creation
    redirect('/onboarding');
  }

  return { userId, orgId };
}

/**
 * Check if user has access to a specific organization
 */
export async function checkOrgAccess(orgId: string): Promise<boolean> {
  const { userId } = await auth();
  if (!userId) return false;

  const client = await clerkClient();
  const orgMemberships = await client.users.getOrganizationMembershipList({ userId });
  
  return orgMemberships.data.some((membership) => membership.organization.id === orgId);
}
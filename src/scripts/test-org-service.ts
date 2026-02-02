import { prisma } from '../lib/prisma';
import { OrgService } from '../lib/services/org.service';

async function main() {
    console.log("Starting OrgService Test...");

    // cleanup
    console.log("Cleaning up test data...");
    await prisma.joinRequest.deleteMany({ where: { user: { email: { contains: 'test_org' } } } });
    await prisma.orgInviteLink.deleteMany({ where: { organization: { slug: { contains: 'test-org' } } } });
    await prisma.orgMembership.deleteMany({ where: { user: { email: { contains: 'test_org' } } } });
    await prisma.organization.deleteMany({ where: { slug: { contains: 'test-org' } } });
    await prisma.user.deleteMany({ where: { email: { contains: 'test_org' } } });

    // 1. Create Users
    console.log("Creating users...");
    const owner = await prisma.user.create({
        data: {
            id: 'user_test_owner_' + Date.now(),
            email: 'test_org_owner@example.com',
            name: 'Test Owner'
        }
    });

    const member1 = await prisma.user.create({
        data: {
            id: 'user_test_member1_' + Date.now(),
            email: 'test_org_member1@example.com',
            name: 'Test Member 1'
        }
    });

    // 2. Create Organization
    console.log("Creating organization...");
    const org = await OrgService.createOrganization(owner.id, "Test Org Service");
    console.log("Organization created:", org.slug);

    // Verify membership
    const ownerMembership = await prisma.orgMembership.findUnique({
        where: { userId_organizationId: { userId: owner.id, organizationId: org.id } }
    });
    if (!ownerMembership || ownerMembership.role !== 'owner') throw new Error("Owner membership failed");

    // 3. Create Invite
    console.log("Creating invite...");
    const invite = await OrgService.createInvite(owner.id, org.id);
    console.log("Invite token:", invite.token);

    // 4. Join via Invite
    console.log("Joining via invite...");
    const result = await OrgService.joinViaInvite(member1.id, invite.token);
    if (!result.success) throw new Error("Join failed");

    // Verify member membership
    const memberMembership = await prisma.orgMembership.findUnique({
        where: { userId_organizationId: { userId: member1.id, organizationId: org.id } }
    });
    if (!memberMembership || memberMembership.role !== 'member') throw new Error("Member join failed");

    // 5. Check Limits (Try to create 3rd invite, limit is 2)
    console.log("Checking invite limits...");
    try {
        await OrgService.createInvite(owner.id, org.id); // 2nd invite
        await OrgService.createInvite(owner.id, org.id); // 3rd invite (should fail)
        console.error("FAILED to enforce invite limit");
    } catch (e: any) {
        if (e.message.includes("Invite limit reached")) {
            console.log("Invite limit correctly enforced");
        } else {
            console.error("Unexpected error on invite limit:", e);
        }
    }

    // 6. Check Member Limits (Try to add 6th member, limit is 5)
    // Already have 2 members (owner + member1). Need 3 more to reach 5. Then 6th should fail.
    console.log("Checking member limits...");
    for (let i = 2; i <= 5; i++) {
        const user = await prisma.user.create({
            data: {
                id: `user_test_member${i}_` + Date.now(),
                email: `test_org_member${i}@example.com`,
                name: `Test Member ${i}`
            }
        });
        // Create a fresh invite for each because we used the previous one once and we might hit max uses if defaulted? 
        // Default maxUses is 100. So we can reuse the first invite `invite`.
        // But we assume `invite` is valid.
        await OrgService.joinViaInvite(user.id, invite.token);
    }

    // Now we have 5 members. Try 6th.
    const member6 = await prisma.user.create({
        data: {
            id: `user_test_member6_` + Date.now(),
            email: `test_org_member6@example.com`,
            name: `Test Member 6`
        }
    });

    try {
        await OrgService.joinViaInvite(member6.id, invite.token);
        console.error("FAILED to enforce member limit");
    } catch (e: any) {
        if (e.message.includes("Organization is full")) {
            console.log("Member limit correctly enforced");
        } else {
            console.error("Unexpected error on member limit:", e);
        }
    }

    console.log("Test Complete!");
}

main().catch(console.error).finally(async () => {
    await prisma.$disconnect();
});

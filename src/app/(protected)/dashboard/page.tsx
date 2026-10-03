import { redirect } from "next/navigation";
import { requireOrg } from "@/lib/auth";

export default async function DashboardPage() {
    const { orgId } = await requireOrg();
    redirect(`/${orgId}/projects`);
}

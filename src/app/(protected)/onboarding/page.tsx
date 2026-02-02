import { CreateOrganization } from "@clerk/nextjs";

export default function OnboardingPage() {
    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <CreateOrganization afterCreateOrganizationUrl="/:slug/projects" />
        </div>
    );
}

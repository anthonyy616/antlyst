import { OrganizationProfile } from "@clerk/nextjs";

export default function OrgSettingsPage() {
    return (
        <div className="container mx-auto py-8 px-4 flex justify-center">
            <OrganizationProfile />
        </div>
    );
}

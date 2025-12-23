import { UserButton, OrganizationSwitcher } from '@clerk/nextjs';
import { requireAuth } from '@/lib/auth';
import Link from 'next/link';

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgId: string }>;
}) {
  await requireAuth();
  const { orgId } = await params;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-white px-6 py-4 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xl font-bold text-brand-purple">
              Antlyst
            </Link>
            <div className="h-6 w-px bg-slate-200" />
            <OrganizationSwitcher
              afterCreateOrganizationUrl="/onboarding"
              afterLeaveOrganizationUrl="/onboarding"
              afterSelectOrganizationUrl="/:id/projects"
            />
            <nav className="hidden md:flex items-center gap-4 ml-4">
              <Link href={`/${orgId}/projects`} className="text-sm font-medium hover:text-brand-purple transition-colors">
                Projects
              </Link>
              <Link href={`/${orgId}/settings`} className="text-sm font-medium hover:text-brand-purple transition-colors">
                Settings
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>
      <main className="flex-1 bg-slate-50">{children}</main>
    </div>
  );
}
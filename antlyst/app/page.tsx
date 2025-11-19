import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function HomePage() {
  const { userId, orgId } = await auth();

  // If logged in, redirect to dashboard
  if (userId && orgId) {
    redirect(`/${orgId}/projects`);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-4xl text-center">
        <h1 className="mb-6 text-6xl font-bold text-slate-900">
          Analytics SaaS
        </h1>
        <p className="mb-8 text-xl text-slate-600">
          Upload your data. Get instant dashboards with ML insights.
          <br />
          Switch between Simple, ML, and Power BI styles in one click.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/sign-up">
            <Button size="lg" className="text-lg">
              Start Free →
            </Button>
          </Link>
          <Link href="/sign-in">
            <Button size="lg" variant="outline" className="text-lg">
              Sign In
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
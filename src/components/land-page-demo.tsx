'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, FileUp, BarChart3, Sparkles } from 'lucide-react';

export function LandingDemoCTA() {
  return (
    <div className="mx-auto max-w-5xl px-4">
      <div className="rounded-2xl border border-brand-purple/10 bg-gradient-to-br from-brand-purple/5 to-white p-8 shadow-sm sm:p-12">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="flex items-center gap-2 text-sm font-medium text-brand-purple">
            <Sparkles className="h-4 w-4" />
            Try the demo workspace
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Go from raw data to a dashboard in minutes.
          </h1>
          <p className="max-w-xl text-muted-foreground text-sm sm:text-base">
            Pick sample data, choose a style, and explore. You can replace it with your own files
            at any time.
          </p>
          <Button asChild size="lg" className="gap-2">
            <Link href="/onboarding">
              <FileUp className="h-4 w-4" />
              Create a demo workspace
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground">
            No account required for the demo workspace.
          </p>
        </div>
      </div>
    </div>
  );
}

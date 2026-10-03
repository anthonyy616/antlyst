import Link from 'next/link';
import { AlertTriangle, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-lg">Page not found</CardTitle>
          <CardDescription>
            This link may be expired, private, or no longer available. You can
            go back home or try the previously shared link again.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p>The page you are looking for was not found in this workspace.</p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            <Button variant="default" asChild>
              <Link href="/">
                <Home className="h-4 w-4 mr-2" />
                Back home
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go back
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

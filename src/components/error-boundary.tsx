'use client';

import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export interface ErrorBoundaryProps {
  children: ReactNode;
  /**
   * Optional recovery action, such as refreshing the page or returning
   * to the homepage. Leave unset if no safe recovery is possible.
   */
  onReset?: () => void;
}

/**
 * Branded error boundary for the public, auth, and dashboard flows.
 * The UI is deliberate: the user sees what happened, what to try, and
 * how to continue.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps> {
  override state = {
    hasError: false,
    error: null as Error | null,
  };

  static getDerivedStatefromError(error: Error) {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: unknown) {
    // Error category goes to the shared logger instead of the console.
    console.error('[ErrorBoundary]', error, info);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  private handleHome = () => {
    window.location.href = '/';
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-lg">Something went wrong</CardTitle>
            <CardDescription>
              We hit an unexpected error. Try the recovery action below, or go
              back home and try again later.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p className="font-medium">Error ID</p>
              <p>{this.state.error?.message ?? 'Unknown error'}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {this.props.onReset ? (
                <Button variant="default" onClick={this.handleReset}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try again
                </Button>
              ) : (
                <Button variant="outline" onClick={this.handleHome}>
                  <Home className="h-4 w-4 mr-2" />
                  Back home
                </Button>
              )}
            </div>

            <Button variant="ghost" className="text-xs" onClick={() => (window.location.href = '/')}>
              <Square className="h-4 w-4 mr-2" />
              Review our status page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
}

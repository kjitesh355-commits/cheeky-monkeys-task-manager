'use client';

import React from 'react';

type Props = { children: React.ReactNode };
type State = { error: Error | null };

/**
 * Catches render crashes inside the workspace shell (AppShell is rendered from
 * the (workspace) layout, which sits above the route-level error boundary).
 * Keeps the rest of the document intact and offers an in-place retry.
 */
export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  retry = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-6">
          <div className="w-full max-w-md space-y-3 rounded-2xl border border-border bg-card p-8 text-center shadow-sm" data-testid="app-error-boundary">
            <p className="text-sm font-semibold text-red-600">Something went wrong</p>
            <h1 className="text-lg font-bold text-foreground">We hit an unexpected error</h1>
            <p className="text-sm text-muted-foreground">
              {error.message || 'An error occurred while rendering the workspace.'}
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.retry}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
              >
                Reload
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

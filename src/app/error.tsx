'use client';

import Link from 'next/link';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-3 rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <p className="text-sm font-semibold text-red-600">Something went wrong</p>
        <h1 className="text-lg font-bold text-foreground">We hit an unexpected error</h1>
        <p className="text-sm text-muted-foreground">
          {error.message || 'An error occurred while rendering this page.'}
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Try again
          </button>
          <Link
            href="/home"
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

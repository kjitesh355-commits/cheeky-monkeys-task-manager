import { AppShell } from '@/components/layout/AppShell';
import { AppErrorBoundary } from '@/components/ui/AppErrorBoundary';

/**
 * Every sidebar destination is a real route (see src/lib/routes.ts).
 * The shell (nav, header, modals, task panel) lives in this shared layout so it
 * persists across navigations; which view renders inside it is derived from the
 * URL (synced into WorkspaceContext), so tab switches and deep links stay in sync.
 * AppErrorBoundary catches render crashes in the shell — layout errors sit
 * above the route-level error.tsx, so the shell carries its own boundary.
 */
export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppErrorBoundary>
      <AppShell />
      {children}
    </AppErrorBoundary>
  );
}

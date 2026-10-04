import type { Metadata } from 'next';
import { Suspense } from 'react';
import './globals.css';
import { Toaster } from 'sonner';
import { WorkspaceProvider } from '../context/WorkspaceContext';

export const metadata: Metadata = {
  title: 'WORKSPACE | Company Productivity Platform',
  description: 'Enterprise company operating system for managing departments, projects, tasks, and team collaboration.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <body className="antialiased selection:bg-primary/20 selection:text-primary">
        <Suspense fallback={null}>
          <WorkspaceProvider>{children}</WorkspaceProvider>
        </Suspense>
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}

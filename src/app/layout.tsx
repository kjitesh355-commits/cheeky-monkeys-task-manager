import type { Metadata } from 'next';
import './globals.css';
import { WorkspaceProvider } from '../context/WorkspaceContext';

export const metadata: Metadata = {
  title: 'WORKSPACE | Enterprise Productivity Platform',
  description: 'Next-gen enterprise company operating system inspired by ClickUp, Linear, and Notion.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased selection:bg-primary/30 selection:text-primary">
        <WorkspaceProvider>{children}</WorkspaceProvider>
      </body>
    </html>
  );
}

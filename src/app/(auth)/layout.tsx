import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'WORKSPACE | Sign In',
  description: 'Sign in to your WORKSPACE account',
};

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Root layout already renders <html>/<body>; nesting a second pair here
  // makes the body class mismatch during hydration.
  return <>{children}</>;
}
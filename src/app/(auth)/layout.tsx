import type { Metadata } from 'next';
import '../globals.css';

export const metadata: Metadata = {
  title: 'WORKSPACE | Sign In',
  description: 'Sign in to your WORKSPACE account',
};

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
import { Suspense } from 'react';
import LoginForm from './LoginForm';

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background bg-gradient-subtle px-4 py-12 select-none">
      <Suspense fallback={<LoginFormSkeleton />}>
        <LoginFormWrapper searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function LoginFormWrapper({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const params = await searchParams;
  return <LoginForm redirectTo={params.redirectTo || '/'} />;
}

function LoginFormSkeleton() {
  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 mb-4 animate-pulse" />
        <div className="h-8 bg-secondary/50 w-3/4 mx-auto rounded animate-pulse" />
        <div className="h-4 bg-secondary/50 w-1/2 mx-auto rounded mt-2 animate-pulse" />
      </div>
      <div className="clean-card p-8 space-y-6 animate-pulse">
        <div className="h-6 bg-secondary/50 w-1/3 mx-auto rounded" />
        <div className="h-4 bg-secondary/50 w-1/2 mx-auto rounded" />
        <div className="space-y-4">
          <div className="h-16 bg-secondary/50 rounded-xl" />
          <div className="h-16 bg-secondary/50 rounded-xl" />
          <div className="h-12 bg-secondary/50 rounded-xl" />
          <div className="h-12 bg-secondary/50 rounded-xl" />
        </div>
        <div className="h-12 bg-secondary/50 rounded-xl" />
        <div className="h-12 bg-secondary/50 rounded-xl" />
      </div>
    </div>
  );
}
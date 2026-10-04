import { Suspense } from 'react';
import ResetPasswordForm from './ResetPasswordForm';

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background bg-gradient-subtle px-4 py-12 select-none">
      <Suspense fallback={<ResetPasswordFormSkeleton />}>
        <ResetPasswordFormWrapper searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ResetPasswordFormWrapper({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const params = await searchParams;
  return <ResetPasswordForm type={params.type || null} />;
}

function ResetPasswordFormSkeleton() {
  return (
    <div className="w-full max-w-md">
      <div className="mb-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 mb-4 animate-pulse" />
          <div className="h-8 bg-secondary/50 w-3/4 mx-auto rounded animate-pulse" />
          <div className="h-4 bg-secondary/50 w-1/2 mx-auto rounded mt-2 animate-pulse" />
        </div>
      </div>
      <div className="clean-card p-8 space-y-6 animate-pulse">
        <div className="h-6 bg-secondary/50 w-1/3 mx-auto rounded" />
        <div className="h-4 bg-secondary/50 w-1/2 mx-auto rounded" />
        <div className="h-16 bg-secondary/50 rounded-xl" />
        <div className="h-12 bg-secondary/50 rounded-xl" />
      </div>
    </div>
  );
}
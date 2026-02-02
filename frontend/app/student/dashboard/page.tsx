import { Suspense } from 'react';
import DashboardClient from './DashboardClient';

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center space-y-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-800 border-t-indigo-500" />
        <p className="text-zinc-500 text-sm animate-pulse">Loading dashboard...</p>
      </div>
    }>
      <DashboardClient />
    </Suspense>
  );
}

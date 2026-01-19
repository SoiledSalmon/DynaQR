'use client';

import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-red-600">403 - Unauthorized</h1>
        <p className="mt-4 text-lg text-gray-700">
          You do not have permission to access this page.
        </p>
        <div className="mt-8">
          <Link
            href="/login"
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Return to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

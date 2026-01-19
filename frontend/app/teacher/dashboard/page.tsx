'use client';

import { useRouter } from 'next/navigation';
import RouteGuard from '../../../lib/routeGuard';
import { clearToken as authClearToken } from '../../../lib/auth';
import { clearUserRole as roleClearRole } from '../../../lib/role';

export default function TeacherDashboard() {
  const router = useRouter();

  const handleLogout = () => {
    authClearToken();
    roleClearRole();
    router.push('/login');
  };

  return (
    <RouteGuard allowedRoles={['teacher']}>
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="mx-auto max-w-4xl bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Teacher Dashboard</h1>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
            >
              Logout
            </button>
          </div>
          <p className="text-gray-600">Welcome to the Teacher Dashboard.</p>
          <div className="mt-4 p-4 border border-green-200 bg-green-50 rounded">
             <p className="text-sm text-green-800">Session Creation features will be enabled here in Phase 6.</p>
          </div>
        </div>
      </div>
    </RouteGuard>
  );
}

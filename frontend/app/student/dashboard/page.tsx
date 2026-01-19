'use client';

import { useRouter } from 'next/navigation';
import RouteGuard from '../../../lib/routeGuard';
import { clearToken, clearUserRole } from '../../../lib/auth';
import { clearUserRole as removeRole } from '../../../lib/role'; // Need to be careful with imports/exports

// Re-check auth imports. 
// auth.ts has: saveToken, getToken, clearToken
// role.ts has: saveUserRole, getUserRole, clearUserRole
// I should import clearToken from auth and clearUserRole from role.

import { clearToken as authClearToken } from '../../../lib/auth';
import { clearUserRole as roleClearRole } from '../../../lib/role';

export default function StudentDashboard() {
  const router = useRouter();

  const handleLogout = () => {
    authClearToken();
    roleClearRole();
    router.push('/login');
  };

  return (
    <RouteGuard allowedRoles={['student']}>
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="mx-auto max-w-4xl bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Student Dashboard</h1>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
            >
              Logout
            </button>
          </div>
          <p className="text-gray-600">Welcome to the Student Dashboard.</p>
          <div className="mt-4 p-4 border border-blue-200 bg-blue-50 rounded">
             <p className="text-sm text-blue-800">Attendance Marking features will be enabled here in Phase 6.</p>
          </div>
        </div>
      </div>
    </RouteGuard>
  );
}

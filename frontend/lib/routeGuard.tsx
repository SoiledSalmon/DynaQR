'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from './auth';
import { getUserRole, UserRole } from './role';

interface RouteGuardProps {
  children: ReactNode;
  allowedRoles: UserRole[];
}

/**
 * RouteGuard Component
 * 
 * A client-side wrapper that restricts access to its children based on authentication
 * status and user roles.
 * 
 * BEHAVIOR:
 * 1. Checks for a valid auth token. If missing -> Redirects to /login.
 * 2. Checks for a valid user role. If missing -> Redirects to /login.
 * 3. Checks if the user's role is in `allowedRoles`. If not -> Redirects to /unauthorized.
 * 
 * USAGE:
 * Wrap protected page content or layouts with this component:
 * 
 * <RouteGuard allowedRoles={['student']}>
 *   <StudentDashboard />
 * </RouteGuard>
 * 
 * NOTE: This is UX-level protection only. Real security happens on the backend API.
 */
export default function RouteGuard({ children, allowedRoles }: RouteGuardProps) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // 1. Check for Authentication Token
    const token = getToken();
    if (!token) {
      console.warn('RouteGuard: No token found. Redirecting to /login.');
      router.push('/login');
      return;
    }

    // 2. Check for User Role
    const role = getUserRole();
    if (!role) {
      console.warn('RouteGuard: No role found. Redirecting to /login.');
      router.push('/login');
      return;
    }

    // 3. Check Role Authorization
    if (!allowedRoles.includes(role)) {
      console.warn(`RouteGuard: Role '${role}' not authorized. Redirecting to /unauthorized.`);
      router.push('/unauthorized');
      return;
    }

    // If all checks pass, allow rendering
    setAuthorized(true);
  }, [router, allowedRoles]);

  // Prevent flashing of protected content before checks are complete
  if (!authorized) {
    return null; // Or return a loading spinner here
  }

  return <>{children}</>;
}

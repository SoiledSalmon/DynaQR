/**
 * role.ts
 *
 * Utility functions for managing user roles on the frontend.
 *
 * STRATEGY:
 * The frontend does NOT decide roles. Roles are authoritative and immutable,
 * assigned by the backend and included in the authentication response (and typically the JWT).
 *
 * PERSISTENCE:
 * We store the role in localStorage alongside the auth token for quick access
 * in client-side routing and conditional rendering.
 *
 * SECURITY & AUTHORIZATION:
 * - Frontend role checks are for UX only (showing/hiding UI elements, redirecting).
 * - REAL authorization must be performed on the backend by verifying the JWT.
 *
 * FUTURE MIGRATION (OAuth/Production):
 * - When switching to OAuth, the role will still come from the backend/identity provider.
 * - This logic remains largely the same: the frontend receives a role and persists it
 *   to maintain state between sessions.
 */

export type UserRole = 'student' | 'teacher';

const USER_ROLE_KEY = 'user_role';

/**
 * Persists the user role to localStorage.
 * This should be called immediately after a successful login response.
 * @param role The role received from the authoritative backend response.
 */
export const saveUserRole = (role: UserRole): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_ROLE_KEY, role);
  }
};

/**
 * Retrieves the stored user role.
 * Useful for client-side routing decisions and conditional rendering.
 * @returns The user role or null if not authenticated.
 */
export const getUserRole = (): UserRole | null => {
  if (typeof window !== 'undefined') {
    const role = localStorage.getItem(USER_ROLE_KEY);
    if (role === 'student' || role === 'teacher') {
      return role as UserRole;
    }
  }
  return null;
};

/**
 * Removes the user role from localStorage.
 * Should be called during logout alongside clearToken().
 */
export const clearUserRole = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(USER_ROLE_KEY);
  }
};

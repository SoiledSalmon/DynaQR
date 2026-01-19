/**
 * auth.ts
 *
 * Utility functions for handling authentication tokens on the client side.
 *
 * STRATEGY:
 * We are currently using localStorage to store the JWT.
 *
 * PROS:
 * - Easy to implement for mock/prototype phases.
 * - Works seamlessly with the "Authorization: Bearer <token>" pattern.
 *
 * CONS:
 * - Vulnerable to XSS (Cross-Site Scripting) if the app has security flaws.
 *
 * FUTURE MIGRATION (OAuth/Production):
 * - Move to HttpOnly cookies for better security.
 * - When switching to OAuth, the backend would set an HttpOnly cookie.
 * - The `getToken` function might then become obsolete or strictly for reading
 *   non-sensitive user state, while `api.ts` would rely on the browser automatically
 *   sending cookies.
 */

const AUTH_TOKEN_KEY = 'auth_token';

/**
 * Saves the JWT to localStorage.
 * @param token The JWT string received from the backend/mock API.
 */
export const saveToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  }
};

/**
 * Retrieves the JWT from localStorage.
 * @returns The token string or null if not found.
 */
export const getToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  }
  return null;
};

/**
 * Removes the JWT from localStorage.
 * Used during logout.
 */
export const clearToken = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
};

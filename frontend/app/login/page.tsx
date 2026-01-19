'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../lib/api';
import { saveToken } from '../../lib/auth';
import { saveUserRole, UserRole } from '../../lib/role';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole | ''>('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    setError('');

    if (!email) {
      setError('Email is required.');
      return false;
    }

    if (!email.endsWith('@rvce.edu.in')) {
      setError('Email must use the @rvce.edu.in domain.');
      return false;
    }

    // Role selection is kept for UX consistency, even if backend determines authority
    if (!role) {
      setError('Please select a role.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      // Real Backend API Call
      // Note: We send the email. The backend determines the role/identity.
      // The 'role' state from the form is ignored for auth but kept for UX/Validation alignment.
      const response = await api.post('/api/auth/login', { email });
      const data = response.data;

      // Contract Enforcement: Read authoritative data from response
      const token = data.token;
      const userRole = data.user.role; // Must be accessed from data.user.role

      // Secure Storage via Utilities
      saveToken(token);
      saveUserRole(userRole);

      // Navigation based on AUTHORITATIVE role
      if (userRole === 'student') {
        router.push('/student/dashboard');
      } else if (userRole === 'teacher') {
        router.push('/teacher/dashboard');
      } else {
        setError('Unknown role received from server.');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      
      let msg = 'An unexpected error occurred during login. Please try again.';
      
      if (err.response) {
        // Server responded with a status code
        switch (err.response.status) {
          case 401:
            msg = 'Invalid email address. Please check your credentials.';
            break;
          case 403:
            msg = 'Access forbidden. You do not have permission to log in.';
            break;
          case 400:
            msg = err.response.data?.message || 'Invalid request. Please check your input.';
            break;
          case 429:
             msg = 'Too many login attempts. Please try again later.';
             break;
          case 500:
            msg = 'Server error. Please contact support.';
            break;
          default:
            msg = err.response.data?.message || msg;
        }
      } else if (err.request) {
        // Request was made but no response received
        msg = 'Network error. Please check your internet connection and try again.';
      }
      
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-md">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">Sign in to your account</h2>
          <p className="mt-2 text-sm text-gray-600">
            Select your role and enter your institutional email.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm text-black"
                placeholder="you@rvce.edu.in"
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                Role
              </label>
              <select
                id="role"
                name="role"
                required
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm text-black"
              >
                <option value="" disabled>
                  Select your role
                </option>
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600" role="alert">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className={`group relative flex w-full justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                loading
                  ? 'bg-indigo-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

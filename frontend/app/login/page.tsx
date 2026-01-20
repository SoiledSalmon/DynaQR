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

  // Shared Input Styling baseline
  const inputBaseStyles = "block w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors h-[42px]";

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 font-sans text-zinc-100">
      <div className="w-full max-w-sm space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800">
            <span className="text-xl font-bold text-white">D</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Enter your institutional details to access DynaQR.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 sm:p-8 backdrop-blur-sm">
          <form className="space-y-6" onSubmit={handleSubmit}>
            
            {/* Email Input */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-xs font-medium uppercase tracking-wider text-zinc-500">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputBaseStyles}
                placeholder="id@rvce.edu.in"
              />
            </div>

            {/* Role Select */}
            <div className="space-y-2">
              <label htmlFor="role" className="block text-xs font-medium uppercase tracking-wider text-zinc-500">
                Role
              </label>
              <div className="relative">
                <select
                  id="role"
                  name="role"
                  required
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className={`${inputBaseStyles} appearance-none pr-10`}
                >
                  <option value="" disabled>Select role</option>
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-zinc-500">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-md bg-red-950/30 border border-red-900/50 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="group flex w-full h-[42px] items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin text-white/80" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-zinc-600">
          Issues accessing your account? <a href="#" className="font-medium text-zinc-400 hover:text-zinc-200 transition-colors">Contact Support</a>
        </p>
      </div>
    </div>
  );
}

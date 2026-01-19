'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Role = 'student' | 'teacher';

interface MockUser {
  id: string;
  email: string;
  role: Role;
}

interface MockAuthResponse {
  token: string;
  user: MockUser;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role | ''>('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // MOCK API FUNCTION
  // In the future, this will be replaced by a real fetch call to POST /auth/login
  const mockLoginApi = async (emailInput: string, roleInput: Role): Promise<MockAuthResponse> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          token: 'mock-jwt-token-' + Math.random().toString(36).substring(2),
          user: {
            id: 'user-' + Math.random().toString(36).substring(2),
            email: emailInput,
            role: roleInput,
          },
        });
      }, 800); // Simulate network delay
    });
  };

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

    if (role !== 'student' && role !== 'teacher') {
      setError('Invalid role selected.');
      return;
    }

    setLoading(true);

    try {
      // START MOCK API CALL
      // Replace the following line with:
      // const response = await fetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, role }) });
      const data = await mockLoginApi(email, role);
      // END MOCK API CALL

      // Store token (Mock behavior)
      localStorage.setItem('token', data.token);
      localStorage.setItem('userRole', data.user.role); // Optional: help with client-side checks

      // Redirect based on role
      if (data.user.role === 'student') {
        router.push('/student/dashboard');
      } else if (data.user.role === 'teacher') {
        router.push('/teacher/dashboard');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred during login.');
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
                onChange={(e) => setRole(e.target.value as Role)}
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

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import RouteGuard from '../../../lib/routeGuard';
import { clearToken as authClearToken } from '../../../lib/auth';
import { clearUserRole as roleClearRole } from '../../../lib/role';
import api from '@/lib/api';

export default function TeacherDashboard() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    subject: '',
    section: '',
    startTime: '',
    endTime: ''
  });
  const [createdSessionId, setCreatedSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleLogout = () => {
    authClearToken();
    roleClearRole();
    router.push('/login');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setCreatedSessionId(null);

    try {
      const res = await api.post('/attendance/create', formData);
      setCreatedSessionId(res.data._id);
      setMessage('Session created successfully!');
    } catch (err: any) {
      console.error(err);
      setMessage(err.response?.data?.message || 'Error creating session');
    } finally {
      setLoading(false);
    }
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Creation Form */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Create Attendance Session</h2>
              <form onSubmit={handleCreateSession} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Subject</label>
                  <input
                    type="text"
                    name="subject"
                    required
                    value={formData.subject}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                    placeholder="e.g. Mathematics"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Section</label>
                  <input
                    type="text"
                    name="section"
                    required
                    value={formData.section}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                    placeholder="e.g. A"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Time</label>
                  <input
                    type="datetime-local"
                    name="startTime"
                    required
                    value={formData.startTime}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">End Time</label>
                  <input
                    type="datetime-local"
                    name="endTime"
                    required
                    value={formData.endTime}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Session'}
                </button>
              </form>
              {message && <p className={`mt-4 text-center ${message.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>{message}</p>}
            </div>

            {/* QR Display */}
            <div className="flex flex-col items-center justify-center border-l border-gray-200 pl-8">
              <h2 className="text-xl font-semibold mb-4">Session QR Code</h2>
              {createdSessionId ? (
                <div className="text-center">
                  <div className="bg-white p-4 shadow-lg rounded-lg inline-block border">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${createdSessionId}`} 
                      alt="Session QR Code"
                      className="w-64 h-64"
                    />
                  </div>
                  <p className="mt-4 text-sm text-gray-500">
                    Session ID: <span className="font-mono">{createdSessionId}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Students can scan this to mark attendance.</p>
                </div>
              ) : (
                <div className="text-gray-400 text-center p-8 border-2 border-dashed border-gray-300 rounded-lg w-full h-64 flex items-center justify-center">
                  Create a session to generate QR
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </RouteGuard>
  );
}
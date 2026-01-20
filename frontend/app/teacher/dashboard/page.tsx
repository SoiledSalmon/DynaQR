'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import RouteGuard from '../../../lib/routeGuard';
import { clearToken as authClearToken } from '../../../lib/auth';
import { clearUserRole as roleClearRole } from '../../../lib/role';
import api from '@/lib/api';

interface DashboardMetrics {
  totalSessions: number;
  activeSessions: number;
  sessionsToday: number;
  recentSessions: Array<{
    _id: string;
    subject: string;
    section: string;
    class_start_time: string;
    is_active: boolean;
  }>;
}

export default function TeacherDashboard() {
  const router = useRouter();
  const [view, setView] = useState<'dashboard' | 'generate'>('dashboard');
  const [formData, setFormData] = useState({
    subject: '',
    section: '',
    startTime: '',
    endTime: ''
  });
  const [createdSessionId, setCreatedSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // Dashboard Data State
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);

  const handleLogout = () => {
    authClearToken();
    roleClearRole();
    router.push('/login');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const fetchDashboardData = async () => {
    try {
      setMetricsLoading(true);
      const res = await api.get('/api/attendance/teacher-dashboard');
      setMetrics(res.data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setMetricsLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'dashboard') {
      fetchDashboardData();
    }
  }, [view]);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setCreatedSessionId(null);

    try {
      const res = await api.post('/api/attendance/create', formData);
      setCreatedSessionId(res.data._id);
      setMessage('Session created successfully!');
      // We don't strictly need to refetch metrics here as we are in 'generate' view,
      // but when switching back to dashboard, useEffect will trigger.
    } catch (err: any) {
      console.error(err);
      setMessage(err.response?.data?.message || 'Error creating session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <RouteGuard allowedRoles={['teacher']}>
      <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30">
        <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-10">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-zinc-800 pb-8">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-500/20">
                <span className="text-lg font-bold text-white">D</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white">Faculty Portal</h2>
                <p className="text-sm text-zinc-500">Manage your attendance sessions</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setView(view === 'dashboard' ? 'generate' : 'dashboard')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-500 active:scale-[0.98]"
              >
                {view === 'dashboard' ? (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Generate QR
                  </>
                ) : (
                  'Back to Dashboard'
                )}
              </button>
              <button 
                onClick={handleLogout}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 border border-zinc-800 px-5 py-2.5 text-sm font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
              >
                Logout
              </button>
            </div>
          </div>

          {view === 'dashboard' ? (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm">
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-1">Total Sessions</p>
                  <p className="text-3xl font-bold text-white">
                    {metricsLoading ? '...' : metrics?.totalSessions ?? 0}
                  </p>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm">
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-1">Active Now</p>
                  <p className="text-3xl font-bold text-emerald-500">
                    {metricsLoading ? '...' : metrics?.activeSessions ?? 0}
                  </p>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm">
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-1">Today's Sessions</p>
                  <p className="text-3xl font-bold text-indigo-500">
                    {metricsLoading ? '...' : metrics?.sessionsToday ?? 0}
                  </p>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-zinc-200">Recent Sessions</h3>
                  {/* "View full history" button removed as per requirements */}
                </div>
                
                <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/30 backdrop-blur-sm">
                  {metricsLoading ? (
                    <div className="px-6 py-20 text-center text-zinc-500">Loading recent sessions...</div>
                  ) : metrics?.recentSessions && metrics.recentSessions.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-zinc-900/50 border-b border-zinc-800">
                          <tr>
                            <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Subject</th>
                            <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Section</th>
                            <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Date</th>
                            <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                          {metrics.recentSessions.map((session) => (
                            <tr 
                              key={session._id} 
                              onClick={() => router.push(`/teacher/session/${session._id}`)}
                              className="group hover:bg-zinc-800/30 transition-colors cursor-pointer"
                            >
                              <td className="px-6 py-4 text-sm font-medium text-white">{session.subject}</td>
                              <td className="px-6 py-4 text-sm text-zinc-400">{session.section}</td>
                              <td className="px-6 py-4 text-sm text-zinc-400">
                                {new Date(session.class_start_time).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 text-sm text-right">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                  session.is_active 
                                    ? 'bg-emerald-500/10 text-emerald-400' 
                                    : 'bg-zinc-800 text-zinc-400'
                                }`}>
                                  {session.is_active ? 'Active' : 'Ended'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center space-y-4">
                        <div className="h-12 w-12 rounded-full bg-zinc-800/50 flex items-center justify-center text-zinc-600">
                          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className="text-zinc-500 text-sm max-w-xs mx-auto">
                          Your recent attendance sessions will appear here. Start by generating a new QR code.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Creation Form */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white">Create Session</h3>
                  <p className="text-sm text-zinc-500 mt-1">Fill in the details to generate an attendance QR code.</p>
                </div>

                <form onSubmit={handleCreateSession} className="space-y-5 bg-zinc-900/50 border border-zinc-800 p-8 rounded-2xl backdrop-blur-sm">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wider text-zinc-500 mb-1.5 ml-1">Subject</label>
                      <input
                        type="text"
                        name="subject"
                        required
                        value={formData.subject}
                        onChange={handleChange}
                        className="block w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                        placeholder="e.g. Computer Networks"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wider text-zinc-500 mb-1.5 ml-1">Section</label>
                      <input
                        type="text"
                        name="section"
                        required
                        value={formData.section}
                        onChange={handleChange}
                        className="block w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                        placeholder="e.g. 6th Sem A"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium uppercase tracking-wider text-zinc-500 mb-1.5 ml-1">Start Time</label>
                        <input
                          type="datetime-local"
                          name="startTime"
                          required
                          value={formData.startTime}
                          onChange={handleChange}
                          className="block w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors [color-scheme:dark]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium uppercase tracking-wider text-zinc-500 mb-1.5 ml-1">End Time</label>
                        <input
                          type="datetime-local"
                          name="endTime"
                          required
                          value={formData.endTime}
                          onChange={handleChange}
                          className="block w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors [color-scheme:dark]"
                        />
                      </div>
                    </div>
                  </div>

                  {message && (
                    <div className={`p-3 rounded-lg text-xs font-medium border ${
                      message.includes('Error') 
                        ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}>
                      {message}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : null}
                    {loading ? 'Processing...' : 'Generate Session QR'}
                  </button>
                </form>
              </div>

              {/* QR Display */}
              <div className="flex flex-col items-center justify-center">
                {createdSessionId ? (
                  <div className="text-center space-y-6">
                    <h3 className="text-lg font-semibold text-zinc-200">Active QR Code</h3>
                    <div className="bg-white p-6 shadow-2xl shadow-indigo-500/10 rounded-3xl inline-block border-4 border-zinc-800/50">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${createdSessionId}`} 
                        alt="Session QR Code"
                        className="w-64 h-64"
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs text-zinc-500 uppercase tracking-widest font-medium">Session Identifier</p>
                      <p className="text-sm font-mono bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg text-zinc-300 inline-block">
                        {createdSessionId}
                      </p>
                    </div>
                    <p className="text-xs text-zinc-500 max-w-xs mx-auto italic">
                      Students should scan this code during class time. This QR will expire automatically based on the end time.
                    </p>
                  </div>
                ) : (
                  <div className="text-zinc-600 text-center p-12 border-2 border-dashed border-zinc-800 rounded-3xl w-full max-w-sm aspect-square flex flex-col items-center justify-center space-y-4">
                    <div className="h-16 w-16 rounded-2xl bg-zinc-900 flex items-center justify-center">
                      <svg className="h-8 w-8 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium">No active session</p>
                    <p className="text-xs opacity-60">QR will appear here after creation</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </RouteGuard>
  );
}
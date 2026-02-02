'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import RouteGuard from '@/lib/routeGuard';
import { clearToken as authClearToken } from '../../../lib/auth';
import { clearUserRole as roleClearRole } from '../../../lib/role';

interface ClassMetrics {
  classId: string;
  name: string;
  attended: number;
  total: number;
  percent: number;
}

interface AttendanceRecord {
  _id: string;
  marked_at: string;
  session: {
    _id: string;
    subject: string;
    subject_code: string;
    section: string;
    class_start_time: string;
  } | null;
}

export default function StudentDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [overallPercent, setOverallPercent] = useState(0);
  const [classes, setClasses] = useState<ClassMetrics[]>([]);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Toast State
  const [showToast, setShowToast] = useState(false);

  // Modal State
  const [selectedCourse, setSelectedCourse] = useState<ClassMetrics | null>(null);

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setShowToast(true);
      // Remove the query param to keep the URL clean (optional, but good UX)
      router.replace('/student/dashboard');
      
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 4000);
      
      return () => clearTimeout(timer);
    }
  }, [searchParams, router]);

  // Fetch student attendance metrics AND history
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Parallel fetch for efficiency
      const [metricsRes, historyRes] = await Promise.all([
        api.get('/api/attendance/student-metrics'),
        api.get('/api/attendance/history')
      ]);

      setOverallPercent(metricsRes.data.overallPercent || metricsRes.data.attendancePercentage || 0);
      setClasses(metricsRes.data.classes || []);
      setHistory(historyRes.data || []);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.response?.data?.message || 'Failed to load attendance data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authClearToken();
    roleClearRole();
    router.push('/login');
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter history for the selected course
  const courseHistory = selectedCourse
    ? history.filter(h => h.session?.subject === selectedCourse.name)
    : [];

  return (
    <RouteGuard allowedRoles={['student']}>
      <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30 relative">
        {/* Success Toast */}
        {showToast && (
          <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
            <div className="bg-emerald-500 text-white px-4 py-3 rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-3 border border-emerald-400/20">
              <svg className="h-5 w-5 text-emerald-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-semibold text-sm">Attendance Marked!</p>
                <p className="text-xs text-emerald-100 opacity-90">Your record has been updated.</p>
              </div>
              <button onClick={() => setShowToast(false)} className="ml-2 text-emerald-100 hover:text-white">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-10">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-zinc-800 pb-8">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-white">My Attendance</h2>
                <p className="mt-2 text-zinc-400">Track your progress across all courses.</p>
              </div>
              <div className="flex items-center gap-3">
                <Link 
                  href="/student/scan"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-500 active:scale-[0.98]"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                  Scan QR
                </Link>
                <button 
                  onClick={handleLogout}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 border border-zinc-800 px-5 py-2.5 text-sm font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
                >
                  Logout
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl px-6 py-4 backdrop-blur-sm">
              <div className="text-right">
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Overall Score</p>
                <p className="text-2xl font-bold text-indigo-500">{overallPercent}%</p>
              </div>
              <div className="h-10 w-[1px] bg-zinc-800" />
              <div className="text-right">
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Status</p>
                <p className={`text-sm font-semibold ${overallPercent >= 75 ? 'text-emerald-500' : 'text-amber-500'}`}>
                  {overallPercent >= 75 ? 'On Track' : 'Needs Attention'}
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-800 border-t-indigo-500" />
              <p className="text-zinc-500 text-sm animate-pulse">Retrieving records...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <svg className="h-6 w-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-red-400 text-sm text-center max-w-xs">{error}</p>
              <button
                onClick={fetchData}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Retry
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-zinc-200">Course-wise Breakdown</h3>
                <span className="text-xs text-zinc-500 px-2 py-1 rounded bg-zinc-900 border border-zinc-800">
                  {classes.length} {classes.length === 1 ? 'Course' : 'Courses'}
                </span>
              </div>

              <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/30 backdrop-blur-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-900/80 border-b border-zinc-800">
                        <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-zinc-500">Course Name</th>
                        <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-zinc-500 text-center">Attended</th>
                        <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-zinc-500 text-center">Total</th>
                        <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-zinc-500 text-right">Percentage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {classes.map(cls => (
                        <tr 
                          key={cls.classId} 
                          onClick={() => setSelectedCourse(cls)}
                          className="hover:bg-zinc-800/30 transition-colors group cursor-pointer"
                        >
                          <td className="px-6 py-4">
                            <span className="font-medium text-zinc-200 group-hover:text-white transition-colors">{cls.name}</span>
                          </td>
                          <td className="px-6 py-4 text-center text-zinc-400 font-mono text-sm">{cls.attended}</td>
                          <td className="px-6 py-4 text-center text-zinc-400 font-mono text-sm">{cls.total}</td>
                          <td className="px-6 py-4 text-right">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium font-mono border ${
                              cls.percent >= 75 
                                ? 'bg-emerald-500/5 text-emerald-500 border-emerald-500/20' 
                                : 'bg-amber-500/5 text-amber-500 border-amber-500/20'
                            }`}>
                              {cls.percent}%
                            </span>
                          </td>
                        </tr>
                      ))}
                      {classes.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-20 text-center">
                            <div className="flex flex-col items-center space-y-2">
                              <svg className="h-10 w-10 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <p className="text-zinc-500 text-sm italic">No attendance records found for this semester.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tips Section */}
              <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/20 p-4">
                <p className="text-xs text-zinc-500 leading-relaxed italic">
                  Note: A minimum of 75% attendance is typically required for semester eligibility. Please check with your faculty for specific course requirements.
                </p>
              </div>
            </div>
          )}

          {/* Detailed View Modal */}
          {selectedCourse && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
                onClick={() => setSelectedCourse(null)}
              />
              <div className="relative w-full max-w-2xl bg-zinc-900 rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                
                {/* Modal Header */}
                <div className="p-6 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold text-white">{selectedCourse.name}</h3>
                    <p className="text-sm text-zinc-400 mt-1">Attendance Details</p>
                  </div>
                  <button 
                    onClick={() => setSelectedCourse(null)}
                    className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Modal Content */}
                <div className="p-6 overflow-y-auto">
                  {/* Stats Cards */}
                  <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl text-center">
                      <p className="text-xs uppercase text-zinc-500 font-medium mb-1">Total Classes</p>
                      <p className="text-2xl font-bold text-zinc-200">{selectedCourse.total}</p>
                    </div>
                    <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl text-center">
                      <p className="text-xs uppercase text-zinc-500 font-medium mb-1">Attended</p>
                      <p className="text-2xl font-bold text-emerald-500">{selectedCourse.attended}</p>
                    </div>
                    <div className={`bg-zinc-950 border border-zinc-800 p-4 rounded-xl text-center ${
                       selectedCourse.percent >= 75 ? 'border-emerald-900/30' : 'border-amber-900/30'
                    }`}>
                      <p className="text-xs uppercase text-zinc-500 font-medium mb-1">Percentage</p>
                      <p className={`text-2xl font-bold ${
                        selectedCourse.percent >= 75 ? 'text-emerald-500' : 'text-amber-500'
                      }`}>
                        {selectedCourse.percent}%
                      </p>
                    </div>
                  </div>

                  {/* History List */}
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-300 mb-4">Recent Sessions Attended</h4>
                    {courseHistory.length > 0 ? (
                      <div className="border border-zinc-800 rounded-xl overflow-hidden">
                        <table className="w-full text-left">
                          <thead className="bg-zinc-800/50">
                            <tr>
                              <th className="px-4 py-2 text-xs font-medium text-zinc-500 uppercase">Date</th>
                              <th className="px-4 py-2 text-xs font-medium text-zinc-500 uppercase">Time</th>
                              <th className="px-4 py-2 text-xs font-medium text-zinc-500 uppercase text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800 bg-zinc-950/50">
                            {courseHistory.map((record) => (
                              <tr key={record._id}>
                                <td className="px-4 py-3 text-sm text-zinc-300">
                                  {record.session?.class_start_time
                                    ? new Date(record.session.class_start_time).toLocaleDateString()
                                    : 'N/A'}
                                </td>
                                <td className="px-4 py-3 text-sm text-zinc-400 font-mono">
                                  {record.session?.class_start_time
                                    ? new Date(record.session.class_start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                    : 'N/A'}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <span className="text-xs bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded border border-emerald-500/20">
                                    Present
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-10 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
                        <p className="text-zinc-500 text-sm">No attendance records found yet.</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      </div>
    </RouteGuard>
  );
}
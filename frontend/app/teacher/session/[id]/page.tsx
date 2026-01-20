'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import RouteGuard from '@/lib/routeGuard';
import api from '@/lib/api';

interface SessionDetail {
  _id: string;
  subject: string;
  section: string;
  class_start_time: string;
  class_end_time: string;
  is_active: boolean;
  createdAt: string;
}

interface Attendee {
  _id: string;
  student_name: string;
  usn: string;
  timestamp: string;
}

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [session, setSession] = useState<SessionDetail | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sessionId) return;

    const fetchSessionDetails = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/api/attendance/session/${sessionId}`);
        setSession(res.data.session);
        setAttendees(res.data.attendees);
      } catch (err: any) {
        console.error('Error fetching session details:', err);
        setError(err.response?.data?.message || 'Error loading session details');
      } finally {
        setLoading(false);
      }
    };

    fetchSessionDetails();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500">
        Loading session details...
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4 text-zinc-400">
        <p>{error || 'Session not found'}</p>
        <button 
          onClick={() => router.back()}
          className="text-indigo-400 hover:text-indigo-300"
        >
          Go Back
        </button>
      </div>
    );
  }

  const isExpired = new Date() > new Date(session.class_end_time);
  const isActive = session.is_active && !isExpired;

  return (
    <RouteGuard allowedRoles={['teacher']}>
      <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30">
        <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-8">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-6">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => router.back()}
                className="p-2 -ml-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">{session.subject}</h1>
                <p className="text-zinc-500">{session.section}</p>
              </div>
            </div>
            
            <div className={`px-3 py-1 rounded-full text-xs font-medium border ${
              isActive 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                : 'bg-red-500/10 text-red-400 border-red-500/20'
            }`}>
              {isActive ? 'Active Session' : 'Ended / Expired'}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Left Column: Details & QR */}
            <div className="md:col-span-1 space-y-6">
              
              {/* QR Code Card */}
              <div className="bg-white p-4 rounded-2xl shadow-xl shadow-indigo-500/5 border border-zinc-800">
                <div className="aspect-square w-full bg-zinc-100 rounded-xl overflow-hidden mb-4">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${session._id}`} 
                    alt="Attendance QR Code"
                    className="w-full h-full object-cover mix-blend-multiply"
                  />
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-medium mb-1">Session ID</p>
                  <code className="text-xs bg-zinc-100 text-zinc-600 px-2 py-1 rounded block truncate select-all cursor-pointer" title={session._id}>
                    {session._id}
                  </code>
                </div>
              </div>

              {/* Time Details */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm space-y-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-1">Start Time</p>
                  <p className="text-sm text-zinc-300">
                    {new Date(session.class_start_time).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-1">End Time</p>
                  <p className="text-sm text-zinc-300">
                    {new Date(session.class_end_time).toLocaleString()}
                  </p>
                </div>
              </div>

            </div>

            {/* Right Column: Stats & Attendees */}
            <div className="md:col-span-2 space-y-6">
              
              {/* Stats Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-1">Total Attendees</p>
                  <p className="text-3xl font-bold text-white">{attendees.length}</p>
                </div>
                {/* Placeholder for future stats */}
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 flex items-center justify-center text-zinc-600 text-sm">
                  Attendance List
                </div>
              </div>

              {/* Attendees List */}
              <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
                  <h3 className="font-semibold text-zinc-200">Student Log</h3>
                </div>
                
                {attendees.length > 0 ? (
                  <div className="max-h-[500px] overflow-y-auto">
                    <table className="w-full text-left">
                      <thead className="bg-zinc-900/50 border-b border-zinc-800 sticky top-0 backdrop-blur-md">
                        <tr>
                          <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Name</th>
                          <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">USN</th>
                          <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500 text-right">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800">
                        {attendees.map((student) => (
                          <tr key={student._id} className="hover:bg-zinc-800/30 transition-colors">
                            <td className="px-6 py-3 text-sm font-medium text-zinc-300">{student.student_name}</td>
                            <td className="px-6 py-3 text-sm text-zinc-500">{student.usn}</td>
                            <td className="px-6 py-3 text-sm text-zinc-500 text-right font-mono">
                              {new Date(student.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="px-6 py-12 text-center text-zinc-500 text-sm">
                    No students have marked attendance yet.
                  </div>
                )}
              </div>

            </div>
          </div>

        </div>
      </div>
    </RouteGuard>
  );
}
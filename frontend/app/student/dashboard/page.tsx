'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import RouteGuard from '@/lib/routeGuard';

interface ClassMetrics {
  classId: string;
  name: string;
  attended: number;
  total: number;
  percent: number;
}

export default function StudentDashboard() {
  const [overallPercent, setOverallPercent] = useState(0);
  const [classes, setClasses] = useState<ClassMetrics[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch student attendance metrics
  const getMetrics = async () => {
    try {
      setLoading(true);
      const res = await api.get('/attendance/student-metrics');
      // Note: Data structure might need alignment with backend Step 1.1
      setOverallPercent(res.data.overallPercent || res.data.attendancePercentage || 0);
      setClasses(res.data.classes || []);
    } catch (err) {
      console.error('Error fetching metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getMetrics();
  }, []);

  return (
    <RouteGuard allowedRoles={['student']}>
      <div className="p-4 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-4">My Attendance</h2>

        {loading ? (
          <p className="text-center text-gray-500">Loading...</p>
        ) : (
          <>
            <div className="mb-6 p-4 bg-indigo-100 rounded-md text-center">
              <p className="text-lg">Overall Attendance</p>
              <p className="text-3xl font-bold">{overallPercent}%</p>
            </div>

            <h3 className="text-xl font-semibold mb-2">Class-wise Attendance</h3>
            <table className="w-full table-auto border border-gray-300 rounded-md overflow-hidden">
              <thead className="bg-gray-200">
                <tr>
                  <th className="border px-3 py-1">Class</th>
                  <th className="border px-3 py-1">Attended</th>
                  <th className="border px-3 py-1">Total</th>
                  <th className="border px-3 py-1">%</th>
                </tr>
              </thead>
              <tbody>
                {classes.map(cls => (
                  <tr key={cls.classId} className="text-center">
                    <td className="border px-3 py-1">{cls.name}</td>
                    <td className="border px-3 py-1">{cls.attended}</td>
                    <td className="border px-3 py-1">{cls.total}</td>
                    <td className="border px-3 py-1">{cls.percent}%</td>
                  </tr>
                ))}
                {classes.length === 0 && (
                  <tr>
                    <td colSpan={4} className="border px-3 py-4 text-gray-500">No attendance data found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </>
        )}
      </div>
    </RouteGuard>
  );
}

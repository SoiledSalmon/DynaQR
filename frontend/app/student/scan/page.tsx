'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import api from '@/lib/api';

const QrReader = dynamic(() => import('react-qr-reader'), { ssr: false });

export default function ScanPage() {
  const [message, setMessage] = useState('');

  const handleScan = async (data: string | null) => {
    if (!data) return;
    try {
      // data is the QR code secret_key
      const res = await api.post('/attendance/mark', { code: data, sessionId: localStorage.getItem('currentSessionId') });
      setMessage(res.data.message);
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Error marking attendance');
    }
  };

  const handleError = (err: any) => {
    console.error(err);
    setMessage('QR Scan error');
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-center">Scan QR to Mark Attendance</h2>
      <div className="border rounded-md overflow-hidden">
        <QrReader
          onResult={(result, error) => {
            if (!!result) handleScan(result.getText());
            if (!!error) handleError(error);
          }}
          constraints={{ facingMode: 'environment' }}
          className="w-full"
        />
      </div>
      {message && <p className="mt-4 text-center text-indigo-700 font-medium">{message}</p>}
    </div>
  );
}
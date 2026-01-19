'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import api from '@/lib/api';
import RouteGuard from '@/lib/routeGuard';

// Attempt to handle both Default and Named exports for react-qr-reader
const QrReader = dynamic(async () => {
  const mod = await import('react-qr-reader');
  // @ts-ignore
  return mod.QrReader || mod.default || mod;
}, { ssr: false });

export default function ScanPage() {
  const [message, setMessage] = useState('');
  const [scanning, setScanning] = useState(true);

  const handleScan = async (result: any) => {
    if (!result) return;
    
    // In strict mode, QrReader might fire multiple times. Stop after first success.
    if (!scanning) return;

    try {
      // Robustly get text from result (handles different library versions)
      const sessionId = result.getText ? result.getText() : (result.text || result);
      
      if (!sessionId) return;

      setScanning(false); // Stop scanning
      setMessage('Processing...');

      console.log('Scanned Session ID:', sessionId);

      // Call Backend
      const res = await api.post('/attendance/mark', { sessionId });
      setMessage(res.data.message || 'Attendance Marked!');
    } catch (err: any) {
      console.error(err);
      setMessage(err.response?.data?.message || 'Error marking attendance');
      setScanning(true); // Allow retry on error
    }
  };

  return (
    <RouteGuard allowedRoles={['student']}>
      <div className="min-h-screen bg-gray-50 p-4 flex flex-col items-center justify-center">
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-indigo-600 p-4">
            <h2 className="text-white text-xl font-bold text-center">Scan Attendance QR</h2>
          </div>
          
          <div className="p-6">
            <div className="aspect-square bg-black rounded-lg overflow-hidden relative">
              {/* @ts-ignore - Suppress TS errors for the dynamic component */}
              <QrReader
                onResult={(result: any, error: any) => {
                  if (!!result) handleScan(result);
                }}
                constraints={{ facingMode: 'environment' }}
                className="w-full h-full object-cover"
                ViewFinder={() => (
                   <div className="absolute inset-0 border-2 border-indigo-400 opacity-50 m-12 rounded-lg pointer-events-none"></div>
                )}
              />
            </div>
            
            <div className="mt-6 text-center">
              <p className={`text-lg font-medium ${message.includes('Error') ? 'text-red-600' : 'text-indigo-600'}`}>
                {message || 'Align QR code within the frame'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </RouteGuard>
  );
}
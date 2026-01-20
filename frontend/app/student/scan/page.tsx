'use client';

<<<<<<< HEAD
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useEffect } from 'react';
import api from '@/lib/api';

export default function ScanPage() {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      { fps: 10, qrbox: 250 },
      false
    );

    scanner.render(
      async (decodedText) => {
        try {
          const payload = JSON.parse(decodedText);

          await api.post('/attendance/mark', {
            sessionId: payload.sessionId,
            code: payload.code,
          });

          alert('✅ Attendance marked successfully');
          scanner.clear();
        } catch (err) {
          alert('❌ Invalid or expired QR');
        }
      },
      () => {}
    );

    return () => {
      scanner.clear().catch(() => {});
    };
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Scan Attendance QR</h1>
      <div id="qr-reader" />
    </div>
=======
import { useState, useEffect, useRef, useCallback } from 'react';
import api from '@/lib/api';
import RouteGuard from '@/lib/routeGuard';

export default function ScanPage() {
  const [message, setMessage] = useState('');
  const [scanning, setScanning] = useState(true);
  const scannerRef = useRef<any>(null);

  const handleScan = useCallback(async (sessionId: string) => {
    if (!sessionId) return;

    // Prevent multiple simultaneous scans
    setScanning(false);
    setMessage('Processing...');

    try {
      // Stop scanner immediately on success
      if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }

      console.log('Scanned Session ID:', sessionId);

      // Call Backend
      const res = await api.post('/attendance/mark', { sessionId });
      setMessage(res.data.message || 'Attendance Marked!');
    } catch (err: any) {
      console.error(err);
      setMessage(err.response?.data?.message || 'Error marking attendance');
      // Allow retry after 3 seconds
      setTimeout(() => setScanning(true), 3000);
    }
  }, []);

  useEffect(() => {
    let html5QrCode: any;

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        
        // Ensure the element exists before initializing
        const element = document.getElementById('reader');
        if (!element) return;

        html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;

        const config = { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        };

        await html5QrCode.start(
          { facingMode: "environment" },
          config,
          (decodedText: string) => {
            handleScan(decodedText);
          },
          () => {
            // Success callback is enough for our needs
          }
        );
      } catch (err) {
        console.error("Failed to start scanner:", err);
        setMessage("Error starting camera. Please check permissions.");
      }
    };

    if (scanning) {
      startScanner();
    }

    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch((err: any) => console.error("Error stopping scanner:", err));
      }
    };
  }, [scanning, handleScan]);

  return (
    <RouteGuard allowedRoles={['student']}>
      <div className="min-h-screen bg-gray-50 p-4 flex flex-col items-center justify-center">
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-indigo-600 p-4">
            <h2 className="text-white text-xl font-bold text-center">Scan Attendance QR</h2>
          </div>
          
          <div className="p-6">
            <div className="aspect-square bg-black rounded-lg overflow-hidden relative">
              <div id="reader" className="w-full h-full"></div>
              {scanning && (
                <div className="absolute inset-0 border-2 border-indigo-400 opacity-50 m-12 rounded-lg pointer-events-none z-10"></div>
              )}
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
>>>>>>> 9c9b6cc34f21471b33b9502596eda91d8d6ee4f1
  );
}

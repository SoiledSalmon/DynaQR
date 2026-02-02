'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import RouteGuard from '@/lib/routeGuard';

export default function ScanPage() {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [scanning, setScanning] = useState(true);
  const scannerRef = useRef<any>(null);
  const processingRef = useRef<boolean>(false);

  const handleScan = useCallback(async (decodedText: string) => {
    if (!decodedText || processingRef.current) return;

    processingRef.current = true;
    setScanning(false);
    setMessage('Processing...');

    // Parse QR payload - expect JSON { sessionId, token }
    let sessionId: string;
    let qr_token: string | undefined;

    try {
      const payload = JSON.parse(decodedText);
      sessionId = payload.sessionId;
      qr_token = payload.token;
    } catch {
      // Invalid QR format - not JSON
      setMessage('Invalid QR code format. Please scan a valid attendance QR.');
      setTimeout(() => {
        processingRef.current = false;
        setScanning(true);
      }, 3000);
      return;
    }

    if (!sessionId || !qr_token) {
      setMessage('Invalid QR code. Missing required data.');
      setTimeout(() => {
        processingRef.current = false;
        setScanning(true);
      }, 3000);
      return;
    }

    try {
      // Stop scanner immediately to prevent multiple scans
      if (scannerRef.current && scannerRef.current.isScanning) {
        console.log('Stopping scanner for session:', sessionId);
        await scannerRef.current.stop();
      }

      const res = await api.post('/api/attendance/mark', { sessionId, qr_token });
      setMessage(res.data.message || 'Attendance Marked!');

      // Redirect to dashboard on success
      router.push('/student/dashboard?success=true');

    } catch (err: any) {
      console.error('Scan Error:', err);
      const errorMsg = err.response?.data?.message || 'Error marking attendance';
      setMessage(errorMsg);

      // If already marked, treat as success-like state (stop scanning & redirect)
      if (errorMsg.toLowerCase().includes('already marked')) {
        setScanning(false);
        processingRef.current = true;
        // Optional: Redirect even if already marked, or just stay here?
        // Requirement says "After a SUCCESSFUL attendance mark... redirect".
        // "Already marked" is technically not a new success, but for UX it's better to redirect or show status.
        // Let's redirect with a different param or just let them go back manually?
        // Constraint: "Redirect ONLY after backend confirms success".
        // "Already marked" is an error (400), so we do NOT redirect automatically,
        // but we DO stop scanning (which is already handled).
      } else {
        setTimeout(() => {
          processingRef.current = false;
          setScanning(true);
        }, 3000);
      }
    }
  }, [router]);

  useEffect(() => {
    let html5QrCode: any;

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
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
          () => {}
        );
      } catch (err) {
        console.error("Failed to start scanner:", err);
        setMessage("Error starting camera.");
      }
    };

    if (scanning) {
      startScanner();
    }

    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(() => {});
      }
    };
  }, [scanning, handleScan]);

  const resetScanner = () => {
    processingRef.current = false;
    setMessage('');
    setScanning(true);
  };

  return (
    <RouteGuard allowedRoles={['student']}>
      <div className="min-h-screen bg-zinc-950 p-4 flex flex-col items-center justify-center font-sans">
        <div className="w-full max-w-md bg-zinc-900 rounded-2xl shadow-xl border border-zinc-800 overflow-hidden">
          <div className="bg-indigo-600 p-6 relative">
            <Link href="/student/dashboard" className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
            </Link>
            <h2 className="text-white text-xl font-bold text-center">Scan Attendance QR</h2>
            <p className="text-indigo-100 text-xs text-center mt-1 opacity-80">Align the code within the frame</p>
          </div>
          
          <div className="p-8">
            <div className="aspect-square bg-black rounded-xl overflow-hidden relative border border-zinc-800">
              <div id="reader" className="w-full h-full"></div>
              {scanning && (
                <div className="absolute inset-0 border-2 border-indigo-500/50 m-10 rounded-xl pointer-events-none z-10 animate-pulse"></div>
              )}
            </div>
            
            <div className="mt-8 text-center">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                message.toLowerCase().includes('error') || message.toLowerCase().includes('invalid') || message.toLowerCase().includes('failed')
                  ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                  : message 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
              }`}>
                {message || 'Ready to scan'}
              </div>
            </div>
          </div>
          
          <div className="bg-zinc-900/50 border-t border-zinc-800 p-6 text-center">
            <button 
              onClick={resetScanner}
              className="text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Reset Scanner
            </button>
          </div>
        </div>
      </div>
    </RouteGuard>
  );
}
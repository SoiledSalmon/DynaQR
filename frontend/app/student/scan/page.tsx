'use client';

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
  );
}

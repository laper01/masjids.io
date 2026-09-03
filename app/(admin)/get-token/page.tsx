'use client';

import { useEffect, useState } from 'react';

const VAPID_KEY = 'BIm001htRfeqcDu48pgR6Cm9rOP0TVjqONVILJkE6GARbVP4_hgOMD-2zGQRUEsbawrklxBGGNJpQ349zxTiLG8';

export default function GetTokenPage() {
  const [token, setToken] = useState('');
  const [status, setStatus] = useState('Siap');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const getToken = async () => {
    setError('');
    setStatus('Mendaftarkan service worker...');
    try {
      const { getMessaging, getToken } = await import('firebase/messaging');
      const { messaging } = await import('@/lib/firebase'); // path ke file firebase.ts Anda

      if (!messaging) throw new Error('Messaging tidak tersedia (SSR)');

      const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

      setStatus('Meminta izin notifikasi...');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus('Izin ditolak');
        setError('Klik ikon kunci di address bar dan aktifkan Notifikasi.');
        return;
      }

      setStatus('Mengambil token...');
      const fcmToken = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: reg,
      });

      setToken(fcmToken);
      setStatus('Berhasil!');
    } catch (e: any) {
      setStatus('Error');
      setError(e.message || String(e));
    }
  };

  const copyToken = () => {
    navigator.clipboard.writeText(token).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: '0 1rem', fontFamily: 'monospace' }}>
      <h1>FCM Token Generator</h1>
      <p>Status: <strong>{status}</strong></p>

      <button onClick={getToken} style={{ marginRight: 8 }}>Ambil Token</button>
      {token && (
        <button onClick={copyToken}>{copied ? 'Tersalin!' : 'Salin Token'}</button>
      )}

      {error && (
        <p style={{ color: 'red', marginTop: 8 }}>{error}</p>
      )}

      {token && (
        <textarea
          readOnly
          value={token}
          rows={6}
          style={{ width: '100%', marginTop: 16, fontFamily: 'monospace', fontSize: 12 }}
        />
      )}
    </div>
  );
}
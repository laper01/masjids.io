"use client";

import { useEffect, useState } from "react";
import { messaging } from "@/lib/firebase";
import { getToken, onMessage } from "firebase/messaging";

export default function TestNotifPage() {
  const [token, setToken] = useState<string>("");

  const requestPermission = async () => {
    if (!messaging) {
      alert("Messaging tidak tersedia");
      return;
    }

    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      alert("Izin notifikasi ditolak");
      return;
    }

    try {
      const currentToken = await getToken(messaging, {
        vapidKey: "BIm001htRfeqcDu48pgR6Cm9rOP0TVjqONVILJkE6GARbVP4_hgOMD-2zGQRUEsbawrklxBGGNJpQ349zxTiLG8",
      });

      if (currentToken) {
        console.log("TOKEN:", currentToken);
        setToken(currentToken);
      } else {
        console.log("Token tidak ditemukan");
      }
    } catch (error) {
      console.error("Error ambil token:", error);
    }
  };

  useEffect(() => {
    if (!messaging) return;

    onMessage(messaging, (payload) => {
      console.log("Foreground message:", payload);

      alert(
        payload.notification?.title +
          " - " +
          payload.notification?.body
      );
    });
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Test Firebase Notification 🔔</h1>

      <button onClick={requestPermission}>
        Aktifkan Notifikasi
      </button>

      <p style={{ marginTop: 20 }}>
        <b>Token:</b>
      </p>
      <textarea
        value={token}
        readOnly
        style={{ width: "100%", height: 150 }}
      />
    </div>
  );
}
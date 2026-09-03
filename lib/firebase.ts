// lib/firebase.ts

import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyAQfbFRt6-NfTGxzCJF2MLXvtYwzz7Qi3U",
  authDomain: "limestone-62a07.firebaseapp.com",
  projectId: "limestone-62a07",
  storageBucket: "limestone-62a07.firebasestorage.app",
  messagingSenderId: "176843764605",
  appId: "1:176843764605:web:a85863872f29ed9e4fd214",
  measurementId: "G-5RDCMRNPKE"
};

const app = initializeApp(firebaseConfig);

// 👉 ini yang penting
export const messaging =
  typeof window !== "undefined" ? getMessaging(app) : null;
"use client";

import { type ReactNode } from "react";
import { useMasjidsMe } from "@/hooks/useMasjidsMe";  // ← ganti import
import { MosqueProvider } from "@/context/MosqueContext";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { mosques, isLoading, error, refetch } = useMasjidsMe();  // ← ganti hook

  return (
    <MosqueProvider mosqueList={mosques}>
      {children}
    </MosqueProvider>
  );
}
"use client";

/**
 * components/MosqueProviderWrapper.tsx
 *
 * Thin client wrapper that fetches the user's masjids and feeds
 * them into MosqueProvider. Must live inside <SessionProvider>
 * (already satisfied by <Providers> in your AdminLayout).
 */

import { MosqueProvider } from "@/context/MosqueContext";
import { useMasjidsMe } from "@/hooks/useMasjidsMe";

export function MosqueProviderWrapper({ children }: { children: React.ReactNode }) {
  const { mosques, isLoading } = useMasjidsMe();

  return (
    <MosqueProvider mosqueList={mosques} isFetchingMosques={isLoading}>
      {children}
    </MosqueProvider>
  );
}
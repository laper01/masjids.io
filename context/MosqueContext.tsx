"use client";

/**
 * context/MosqueContext.tsx
 *
 * Single source of truth for the active mosque.
 * Wrap your layout (or dashboard layout) with <MosqueProvider>.
 * Any component reads with useMosque() — no prop drilling, no stale closures.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { type Mosque } from "@/types/masjid";

const STORAGE_KEY = "active_mosque";

/* ─── Context shape ───────────────────────────────────────── */
interface MosqueContextValue {
  activeMosque: Mosque | null;
  setActiveMosque: (mosque: Mosque) => void;
  isHydrating: boolean;
}

const MosqueContext = createContext<MosqueContextValue | null>(null);

/* ─── Provider ────────────────────────────────────────────── */
interface MosqueProviderProps {
  children: ReactNode;
  mosqueList: Mosque[]; // pass the fetched list so we can default to [0]
  // ✅ NEW — distinguishes "still fetching, list not populated yet" from
  // "fetch finished, user genuinely has zero mosques". Without this, both
  // cases look identical (mosqueList.length === 0) and the provider used to
  // give up and set isHydrating=false immediately on first render, flashing
  // "No mosque selected" for a moment even when a mosque WILL load shortly.
  isFetchingMosques?: boolean;
}

export function MosqueProvider({ children, mosqueList, isFetchingMosques = false }: MosqueProviderProps) {
  const [activeMosque, setActive] = useState<Mosque | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);

  /* Run once when mosqueList is first populated */
  useEffect(() => {
    // Still waiting on the mosques fetch — don't conclude anything yet,
    // keep isHydrating=true so consumers show a loading state instead of
    // "No mosque selected".
    if (isFetchingMosques) return;

    if (mosqueList.length === 0) {
      setIsHydrating(false);
      return;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved: Mosque = JSON.parse(raw);
        // Make sure the saved mosque still exists in the current list
        const stillValid = mosqueList.find((m) => m.id === saved.id);
        setActive(stillValid ?? mosqueList[0]);
        if (!stillValid) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(mosqueList[0]));
        }
      } else {
        setActive(mosqueList[0]);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mosqueList[0]));
      }
    } catch {
      setActive(mosqueList[0]);
    } finally {
      setIsHydrating(false);
    }
  }, [mosqueList, isFetchingMosques]);

  /** Call this from the modal — updates state AND storage atomically */
  const setActiveMosque = useCallback((mosque: Mosque) => {
    setActive(mosque);                                         // ← triggers re-render everywhere
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mosque));
  }, []);

  return (
    <MosqueContext.Provider value={{ activeMosque, setActiveMosque, isHydrating }}>
      {children}
    </MosqueContext.Provider>
  );
}

/* ─── Consumer hook ───────────────────────────────────────── */
export function useMosque(): MosqueContextValue {
  const ctx = useContext(MosqueContext);
  if (!ctx) throw new Error("useMosque must be used inside <MosqueProvider>");
  return ctx;
}
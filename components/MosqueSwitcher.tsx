"use client";

/**
 * components/MosqueSwitcher.tsx
 *
 * Self-contained header button that:
 *  1. Fetches the current user's masjids via useMasjidsMe (next-auth token)
 *  2. Feeds the list into MosqueProvider so the context auto-selects [0]
 *  3. Opens MosqueSelectionModal on click
 *
 * Drop this anywhere inside <SessionProvider> — it handles auth state itself.
 */

import { useState } from "react";
import { Building2, ChevronRight, Loader2, BadgeCheck } from "lucide-react";
import { useMosque } from "@/context/MosqueContext";
import { useMasjidsMe } from "@/hooks/useMasjidsMe";
import { MosqueSelectionModal } from "@/components/MosqueSelectionModal";

export function MosqueSwitcher() {
  const { activeMosque, setActiveMosque, isHydrating } = useMosque();
  const { mosques, isLoading: fetching, error, refetch } = useMasjidsMe();
  const [open, setOpen] = useState(false);

  const loading = fetching || isHydrating;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={
          activeMosque
            ? `Switch mosque. Currently: ${activeMosque.name}`
            : "Select a mosque"
        }
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 group"
      >
        {loading ? (
          <Loader2 size={13} className="animate-spin text-emerald-500" />
        ) : (
          <Building2 size={13} className="text-emerald-600 shrink-0" aria-hidden="true" />
        )}
        <span
          className="text-xs font-bold text-emerald-700 max-w-[160px] truncate"
          style={{ fontFamily: "Manrope, sans-serif" }}
        >
          {loading ? "Loading…" : (activeMosque?.name ?? "Select Mosque")}
        </span>
        {activeMosque?.is_verified && (
          <BadgeCheck size={12} className="text-emerald-500 shrink-0" aria-label="Verified" />
        )}
        <ChevronRight
          size={11}
          className="text-emerald-400 group-hover:text-emerald-600 transition-colors shrink-0"
          aria-hidden="true"
        />
      </button>

      <MosqueSelectionModal
        isOpen={open}
        onClose={() => setOpen(false)}
        mosqueList={mosques}
        isFetching={fetching}
        fetchError={error}
        onRetry={refetch}
        onMosqueSelect={(mosque) => {
          setActiveMosque(mosque);
          setOpen(false);
        }}
      />
    </>
  );
}
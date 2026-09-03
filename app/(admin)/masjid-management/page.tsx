"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Search, Plus, RefreshCw, AlertCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useMasjids } from "@/hooks/useMasjids";
import { useMasjidsMe } from "@/hooks/useMasjidsMe";
import { useEnrichMasjids } from "@/hooks/useEnrichMasjids";
import { RegisterMasjidModal } from "@/components/masjid/RegisterMasjidModal";
import type { Mosque } from "@/types/masjid";

import { fadeUp } from "./_components/animations";
import { StatsBar } from "./_components/StatsBar";
import { SkeletonRow } from "./_components/SkeletonRow";
import { EmptyState } from "./_components/EmptyState";
import { MasjidRow } from "./_components/MasjidRow";
import { DetailModal } from "./_components/DetailModal";
import { Toast } from "./_components/Toast";

export default function MasjidManagementPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { mosques, isLoading, error, refetch } = useMasjidsMe();
  const { createMasjid, updateMasjid, isUpdating, deleteMasjid } = useMasjids();

  const {
    enriched,
    totalCapacity,
    countryCount,
    refresh: refreshEnrich,
  } = useEnrichMasjids(mosques);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "verified" | "pending">("all");
  const [isRefetching, setIsRefetching] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [editingMasjid, setEditingMasjid] = useState<Mosque | null>(null);
  const [selectedMasjid, setSelectedMasjid] = useState<Mosque | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (message: string, type: "success" | "error" = "success") => {
      if (toastTimeout.current) clearTimeout(toastTimeout.current);
      setToast({ message, type });
      toastTimeout.current = setTimeout(() => setToast(null), 3000);
    },
    []
  );

  const handleRefetch = useCallback(async () => {
    setIsRefetching(true);
    refetch();
    refreshEnrich();
    setTimeout(() => setIsRefetching(false), 800);
  }, [refetch, refreshEnrich]);

  const handleDelete = useCallback(
    async (masjid: Mosque) => {
      try {
        await deleteMasjid(masjid.id);
        showToast(`${masjid.name} deleted`);
        refetch();
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : "Failed to delete masjid",
          "error"
        );
        throw err;
      }
    },
    [deleteMasjid, refetch, showToast]
  );

  const handleEdit = useCallback((masjid: Mosque) => {
    setEditingMasjid(masjid);
  }, []);

  const handleUploadCover = useCallback(
    (masjid: Mosque) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/jpeg,image/png,image/webp";
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        const form = new FormData();
        form.append("file", file);

        try {
          let res = await fetch(`/api/v2/masjids/${masjid.id}/photo/cover`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${session?.accessToken}` },
            body: form,
          });
          if (res.status === 404) {
            res = await fetch(`/api/v2/masjids/${masjid.id}/photo/cover`, {
              method: "POST",
              headers: { Authorization: `Bearer ${session?.accessToken}` },
              body: form,
            });
          }
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          showToast("Cover photo updated");
          refetch();
        } catch (err) {
          showToast(
            err instanceof Error ? err.message : "Upload failed",
            "error"
          );
        }
      };
      input.click();
    },
    [session, refetch, showToast]
  );

  const handleEditFacility = useCallback(
    (masjid: Mosque) => {
      router.push(`/dashboard/masjids/${masjid.id}/settings?tab=facility`);
    },
    [router]
  );

  const filtered = useMemo(() => {
    return enriched
      .filter((m) => {
        if (filter === "verified") return m.is_verified;
        if (filter === "pending") return !m.is_verified;
        return true;
      })
      .filter(
        (m) =>
          m.name.toLowerCase().includes(search.toLowerCase()) ||
          m.location.toLowerCase().includes(search.toLowerCase()) ||
          m.subDomain.toLowerCase().includes(search.toLowerCase())
      );
  }, [enriched, search, filter]);

  return (
    <div className="min-h-screen" style={{ fontFamily: "Inter, sans-serif" }}>

      {/* Page Header */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={0}
        className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8"
      >
        <div>
          <h1
            className="text-3xl font-extrabold text-[#003527] tracking-tight mb-1.5"
            style={{ fontFamily: "Manrope, sans-serif" }}
          >
            My Masjids
          </h1>
          <p className="text-slate-500 text-sm">
            Manage your registered Islamic centres and their settings
          </p>
        </div>

        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRefetch}
            disabled={isLoading || isRefetching}
            data-testid="refresh-list-btn"
            className="p-2.5 bg-[#f2f3ff] hover:bg-[#eaedff] text-[#003527] rounded-xl transition-colors disabled:opacity-40"
            title="Refresh list"
          >
            <RefreshCw size={16} className={cn(isRefetching && "animate-spin")} />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowRegister(true)}
            data-testid="register-masjid-btn"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-[#003527] to-[#064e3b] text-white text-sm font-bold rounded-xl"
            style={{ boxShadow: "0 4px 16px -4px rgba(0,53,39,0.4)" }}
          >
            <Plus size={15} />
            Register Masjid
          </motion.button>
        </div>
      </motion.div>

      {/* Stats Row */}
      {!isLoading && mosques.length > 0 && (
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={1}
          className="mb-6"
        >
          <StatsBar
            mosques={mosques}
            totalCapacity={totalCapacity}
            countryCount={countryCount}
          />
        </motion.div>
      )}

      {/* Error Banner */}
      <AnimatePresence>
        {error && error !== "unauthenticated" && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            data-testid="error-banner"
            className="mb-6 flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm"
          >
            <AlertCircle size={16} className="shrink-0" />
            <span className="flex-1">{error}</span>
            <button
              onClick={handleRefetch}
              data-testid="error-banner-retry-btn"
              className="font-bold underline underline-offset-2 hover:text-red-900 transition-colors"
            >
              Retry
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table Card */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={2}
        className="bg-white rounded-2xl overflow-hidden"
        style={{ boxShadow: "0px 20px 40px -10px rgba(15,23,42,0.08)" }}
      >
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-[#eaedff]">
          <div className="flex bg-[#f2f3ff] p-1 rounded-xl gap-0.5" role="group">
            {(["all"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                aria-pressed={filter === tab}
                data-testid={`filter-tab-${tab}`}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-lg transition-all capitalize whitespace-nowrap",
                  filter === tab
                    ? "bg-white text-[#064e3b] shadow-sm"
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                {tab === "all" ? "All" : tab === "verified" ? "Verified" : "Pending"}
              </button>
            ))}
          </div>

          <div className="relative group">
            <Search
              size={13}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#064e3b] transition-colors"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, city, or subdomain…"
              data-testid="masjid-search-input"
              className="w-full sm:w-64 pl-9 pr-4 py-2 bg-[#f2f3ff] border border-transparent rounded-xl text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#064e3b]/20 focus:bg-white transition-all"
              aria-label="Search masjids"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#f2f3ff]/60">
                {["Name & Brand", "Subdomain", "Location", ""].map((col) => (
                  <th
                    key={col}
                    className={cn(
                      "px-6 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-400",
                      col === "" && "text-right"
                    )}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
              ) : filtered.length === 0 ? (
                <EmptyState search={search} onAdd={() => setShowRegister(true)} />
              ) : (
                <AnimatePresence mode="popLayout">
                  {filtered.map((m, i) => (
                    <MasjidRow
                      key={m.id}
                      masjid={m}
                      index={i}
                      onSelect={setSelectedMasjid}
                      onUploadCover={handleUploadCover}
                      onEditFacility={handleEditFacility}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {!isLoading && filtered.length > 0 && (
          <div className="px-6 py-4 bg-[#f2f3ff]/30 border-t border-[#eaedff] flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Showing{" "}
              <span className="font-bold text-[#131b2e]">{filtered.length}</span>
              {" "}of{" "}
              <span className="font-bold text-[#131b2e]">{mosques.length}</span>{" "}
              masjids
            </p>
            <p className="text-xs text-slate-400 hidden sm:block">
              Click any row for quick view
            </p>
          </div>
        )}
      </motion.div>

      {/* Register Modal */}
      <AnimatePresence>
        {showRegister && (
          <RegisterMasjidModal
            onClose={() => setShowRegister(false)}
            createMasjid={createMasjid}
            onSuccess={() => {
              refetch();
              refreshEnrich();
            }}
          />
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingMasjid && (
          <RegisterMasjidModal
            masjidId={editingMasjid.id}
            initialData={editingMasjid}
            updateMasjid={updateMasjid}
            isUpdating={isUpdating}
            onClose={() => setEditingMasjid(null)}
            onSuccess={() => {
              showToast(`${editingMasjid.name} updated`);
              refetch();
              refreshEnrich();
            }}
          />
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedMasjid && (
          <DetailModal
            masjid={selectedMasjid}
            onClose={() => setSelectedMasjid(null)}
            onDelete={handleDelete}
            onEditFacility={handleEditFacility}
            onEdit={handleEdit}
          />
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} />}
      </AnimatePresence>
    </div>
  );
}
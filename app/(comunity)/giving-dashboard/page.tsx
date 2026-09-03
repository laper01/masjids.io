"use client";

import { useState, useEffect, useCallback } from "react";
import { useMyDonations } from "@/hooks/donations/useMyDonations";
import type { DonationStatus } from "@/types/donations";
import type { GetMyDonationDetailResponse } from "@/types/donations";

// ─── Constants ─────────────────────────────────────────────────────────────────

const STATUS_FILTERS: Array<{ label: string; value: "all" | DonationStatus }> = [
  { label: "All", value: "all" },
  { label: "Succeeded", value: "succeeded" },
  { label: "Pending", value: "pending" },
  { label: "Failed", value: "failed" },
  { label: "Refunded", value: "refunded" },
];

const STATUS_STYLES: Record<DonationStatus, string> = {
  succeeded: "bg-emerald-50 text-emerald-700",
  pending: "bg-amber-50 text-amber-700",
  failed: "bg-red-50 text-red-600",
  refunded: "bg-slate-100 text-slate-500",
};

const STATUS_ICONS: Record<DonationStatus, string> = {
  succeeded: "check_circle",
  pending: "hourglass_top",
  failed: "error",
  refunded: "undo",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────

interface DonationDetailDrawerProps {
  detail: GetMyDonationDetailResponse | null;
  loading: boolean;
  onClose: () => void;
}

function DonationDetailDrawer({ detail, loading, onClose }: DonationDetailDrawerProps) {
  const d = detail?.data;

  return (
    <div
      data-testid="donation-detail-drawer"
      className="fixed inset-0 z-50 flex"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="ml-auto w-full max-w-md bg-white h-full overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white z-10 px-6 pt-6 pb-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-[#064e3b] uppercase tracking-widest mb-0.5">
              Donation Receipt
            </p>
            <h3
              className="text-base font-extrabold text-slate-800"
              style={{ fontFamily: "Manrope, sans-serif" }}
            >
              {loading || !d ? "Loading…" : d.campaign.title}
            </h3>
          </div>
          <button
            data-testid="donation-detail-close"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {loading || !d ? (
          <div data-testid="donation-detail-loading" className="flex items-center justify-center flex-1 py-20">
            <div className="w-10 h-10 rounded-full border-4 border-emerald-100 border-t-[#064e3b] animate-spin" />
          </div>
        ) : (
          <div className="flex-1 px-6 py-6 space-y-6">
            <div className="text-center py-6 rounded-2xl bg-emerald-50/60">
              <p className="text-3xl font-extrabold text-[#003527]" style={{ fontFamily: "Manrope, sans-serif" }}>
                {formatCurrency(d.amount, d.currency)}
              </p>
              <span
                className={`inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[d.status]}`}
              >
                <span className="material-symbols-outlined text-xs">{STATUS_ICONS[d.status]}</span>
                {d.status}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="w-9 h-9 rounded-full bg-[#064e3b] text-white flex items-center justify-center text-xs font-bold shrink-0">
                  {initials(d.masjid.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Masjid</p>
                  <p className="text-sm font-semibold text-slate-700 truncate">{d.masjid.name}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Type", value: d.donation_type.replace("_", " ") },
                  { label: "Payment Method", value: d.payment_method.replace(/_/g, " ") },
                  { label: "Donated At", value: formatDateTime(d.donated_at) },
                  { label: "Currency", value: d.currency.toUpperCase() },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-50 rounded-xl p-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">{label}</p>
                    <p className="text-sm font-semibold text-slate-700 capitalize">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {d.receipt_url ? (
              <a
                data-testid="donation-detail-receipt-link"
                href={d.receipt_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-extrabold text-sm text-white shadow-md hover:-translate-y-0.5 transition-all"
                style={{ background: "linear-gradient(135deg, #003527, #064e3b)" }}
              >
                <span className="material-symbols-outlined text-base">receipt_long</span>
                View Official Receipt
              </a>
            ) : (
              <p data-testid="donation-detail-no-receipt" className="text-center text-xs text-slate-400 italic">
                Receipt not available for this donation.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MyDonationsPage() {
  const [statusFilter, setStatusFilter] = useState<"all" | DonationStatus>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const {
    myDonations,
    myDonationDetail,
    loading,
    error,
    getMyDonations,
    getMyDonationDetail,
    clearError,
    clearMyDonationDetail,
  } = useMyDonations();

  useEffect(() => {
    getMyDonations({ page: 1, limit: 20 });
  }, [getMyDonations]);

  const records = myDonations?.data?.donations ?? [];
  const summary = myDonations?.data?.summary ?? null;
  const meta = myDonations?.metadata;

  const filteredRecords = records.filter((d) =>
    statusFilter === "all" ? true : d.status === statusFilter
  );

  // NOTE: only reflects masjids present in the currently-loaded page of
  // results (the API doesn't expose a global unique-masjid count) — a
  // fair approximation for "supported so far", not a lifetime total.
  const uniqueMasjidsThisPage = new Set(records.map((d) => d.masjid.id)).size;

  const handlePrevPage = useCallback(() => {
    if (!meta || meta.page <= 1) return;
    getMyDonations({ page: meta.page - 1, limit: meta.limit });
  }, [meta, getMyDonations]);

  const handleNextPage = useCallback(() => {
    if (!meta || meta.page >= meta.total_page) return;
    getMyDonations({ page: meta.page + 1, limit: meta.limit });
  }, [meta, getMyDonations]);

  const handleOpenDetail = useCallback(
    (id: string) => {
      setSelectedId(id);
      void getMyDonationDetail(id);
    },
    [getMyDonationDetail]
  );

  const handleCloseDetail = useCallback(() => {
    setSelectedId(null);
    clearMyDonationDetail();
  }, [clearMyDonationDetail]);

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap"
        rel="stylesheet"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        rel="stylesheet"
      />
      <style>{`
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
          vertical-align: middle;
        }
      `}</style>

      <div
        data-testid="my-donations-page"
        className="min-h-screen bg-[#faf8ff] pb-10"
        style={{ fontFamily: "DM Sans, sans-serif" }}
      >
        <section className="p-6 md:p-10 space-y-8 max-w-5xl mx-auto w-full">

          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-[#064e3b] mb-1">
              <span className="material-symbols-outlined text-sm">volunteer_activism</span>
              Sadaqah Jariyah
            </div>
            <h1
              className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-800"
              style={{ fontFamily: "Manrope, sans-serif" }}
            >
              My Donations
            </h1>
            <p className="text-slate-400 max-w-md mx-auto">
              Every gift is a seed for the Hereafter — here's where yours have gone.
            </p>
          </div>

          {error && (
            <div data-testid="my-donations-error" className="flex items-center justify-between gap-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-3 text-sm font-medium">
              <span>{error}</span>
              <button
                data-testid="my-donations-error-dismiss"
                onClick={clearError}
                className="text-red-400 hover:text-red-600 transition-colors"
                aria-label="Dismiss error"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5" data-testid="summary-cards">
            {[
              {
                icon: "payments",
                bg: "bg-emerald-100",
                color: "text-[#064e3b]",
                label: "Total Donated",
                value: summary ? formatCurrency(summary.total_donated, summary.currency) : "—",
                testid: "summary-total-donated",
              },
              {
                icon: "receipt_long",
                bg: "bg-blue-100",
                color: "text-blue-900",
                label: "Total Donations",
                value: String(meta?.total_data ?? 0),
                testid: "summary-total-donations",
              },
              {
                icon: "mosque",
                bg: "bg-sky-100",
                color: "text-sky-900",
                label: "Masjids Supported",
                value: String(uniqueMasjidsThisPage),
                testid: "summary-masjids-supported",
              },
            ].map((card) => (
              <div
                key={card.label}
                data-testid={card.testid}
                className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col hover:-translate-y-0.5 transition-transform"
              >
                <div className={`w-11 h-11 rounded-xl ${card.bg} ${card.color} flex items-center justify-center mb-4`}>
                  <span className="material-symbols-outlined">{card.icon}</span>
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{card.label}</p>
                {loading && !myDonations ? (
                  <div className="mt-2 w-24 h-8 bg-slate-100 rounded-lg animate-pulse" />
                ) : (
                  <p
                    data-testid={`${card.testid}-value`}
                    className="text-3xl font-extrabold mt-1 text-[#003527]"
                    style={{ fontFamily: "Manrope, sans-serif" }}
                  >
                    {card.value}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-slate-800" style={{ fontFamily: "Manrope, sans-serif" }}>
              Donation History
            </h2>
            <div className="flex gap-2 flex-wrap" data-testid="status-filter-group">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  data-testid={`status-filter-${f.value}`}
                  aria-pressed={statusFilter === f.value}
                  onClick={() => setStatusFilter(f.value)}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-full transition-colors ${
                    statusFilter === f.value
                      ? "bg-[#064e3b] text-white"
                      : "bg-slate-100 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {loading && !myDonations && (
            <div className="space-y-3" data-testid="donations-loading-skeleton">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 bg-white rounded-2xl border border-slate-100 animate-pulse" />
              ))}
            </div>
          )}

          {!loading && records.length === 0 && (
            <div data-testid="donations-empty-state" className="flex flex-col items-center justify-center py-20 gap-4 text-center bg-white rounded-2xl border border-slate-100">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-4xl text-emerald-300">volunteer_activism</span>
              </div>
              <h3 className="font-bold text-slate-600" style={{ fontFamily: "Manrope, sans-serif" }}>
                No donations yet
              </h3>
              <p className="text-slate-400 text-sm max-w-xs">
                You haven't made any donations yet. Discover a masjid near you and start your Sadaqah Jariyah today.
              </p>
              <a
                data-testid="donations-empty-discover-link"
                href="/discover"
                className="mt-1 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#003527] text-white text-sm font-bold hover:bg-[#064e3b] transition-colors"
              >
                Discover Masjids
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </a>
            </div>
          )}

          {!loading && records.length > 0 && filteredRecords.length === 0 && (
            <div data-testid="donations-filter-empty-state" className="flex flex-col items-center justify-center py-16 gap-3 text-center bg-white rounded-2xl border border-slate-100">
              <span className="material-symbols-outlined text-3xl text-slate-300">filter_alt_off</span>
              <p className="text-sm text-slate-400">No {statusFilter} donations found.</p>
              <button
                data-testid="donations-filter-reset"
                onClick={() => setStatusFilter("all")}
                className="text-sm font-semibold text-[#064e3b] hover:underline"
              >
                Clear filter
              </button>
            </div>
          )}

          {filteredRecords.length > 0 && (
            <div className="space-y-3" data-testid="donations-list">
              {filteredRecords.map((tx) => (
                <button
                  key={tx.id}
                  data-testid={`donation-row-${tx.id}`}
                  onClick={() => handleOpenDetail(tx.id)}
                  className="w-full text-left bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between gap-4 hover:border-[#064e3b]/30 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-[#064e3b] text-white flex items-center justify-center text-sm font-bold shrink-0">
                      {initials(tx.masjid.name)}
                    </div>
                    <div className="min-w-0">
                      <p data-testid="donation-row-campaign-title" className="font-bold text-sm text-slate-800 truncate">
                        {tx.campaign.title}
                      </p>
                      <p data-testid="donation-row-masjid-name" className="text-xs text-slate-400 truncate">
                        {tx.masjid.name}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right hidden sm:block">
                      <p data-testid="donation-row-date" className="text-xs text-slate-400">
                        {formatDate(tx.donated_at)}
                      </p>
                      <span
                        data-testid="donation-row-status"
                        className={`inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${STATUS_STYLES[tx.status]}`}
                      >
                        <span className="material-symbols-outlined text-xs">{STATUS_ICONS[tx.status]}</span>
                        {tx.status}
                      </span>
                    </div>
                    <p data-testid="donation-row-amount" className="text-base font-extrabold text-[#003527] whitespace-nowrap">
                      {formatCurrency(tx.amount, tx.currency)}
                    </p>
                    <span className="material-symbols-outlined text-slate-300">chevron_right</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {meta && meta.total_page > 1 && (
            <div className="flex items-center justify-center gap-4 pt-2" data-testid="pagination-controls">
              <button
                data-testid="pagination-prev"
                onClick={handlePrevPage}
                disabled={meta.page <= 1 || loading}
                className="flex items-center gap-1 px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-500 hover:border-[#064e3b] hover:text-[#064e3b] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-base">chevron_left</span>
                Prev
              </button>
              <span data-testid="pagination-indicator" className="text-sm text-slate-400 font-medium">
                Page {meta.page} of {meta.total_page}
              </span>
              <button
                data-testid="pagination-next"
                onClick={handleNextPage}
                disabled={meta.page >= meta.total_page || loading}
                className="flex items-center gap-1 px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-500 hover:border-[#064e3b] hover:text-[#064e3b] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
                <span className="material-symbols-outlined text-base">chevron_right</span>
              </button>
            </div>
          )}

          <p className="text-center text-slate-300 text-sm pt-4">
            © 2024 masjids.io — Empowering Community Giving
          </p>
        </section>
      </div>

      {selectedId && (
        <DonationDetailDrawer
          detail={myDonationDetail}
          loading={loading && !myDonationDetail}
          onClose={handleCloseDetail}
        />
      )}
    </>
  );
}
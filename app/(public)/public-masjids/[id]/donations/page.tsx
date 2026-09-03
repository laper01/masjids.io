/**
 * app/(dashboard)/[id]/donations/page.tsx
 */
"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useDonations } from "@/hooks/donations/useDonations";
import { StripePaymentDrawer } from "@/components/donations/StripePaymentDrawer";
import type {
  CampaignListItem,
  CampaignStatus,
  InitiateDonationRequest,
  DonationInterval,
  DonationRecord,
} from "@/types/api";

function fmt(n: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: currency.toUpperCase(),
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}

const FALLBACK_IMGS = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAU1NTZDvFGAn_IOyI0Y7Os-u5wOdGLXVq2MYC3RZxcp2f57JD1h-FvImnT9UacVozx8M4QY9wVYee6wDPiNEJrNVH2vOOju9Xjwbxn-rk5Kc0W51O_vnaLUYFAq3UrPFN_eImJhWypA4OLARaBXGR2RvAhbKWNknLeU91SKbLFjpWbLr9E0aiG4WscAYwurIHlF605Yu5Ly5gtr7PCmhRwTF6GaxyefXoUw6iVh4TquOgJLzeBDLpQsTB1q82edW1bvYWumEdbTJw",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAOODg3U3Y0XlP1RktAEawclPFyuzzgwmL4U_vY4k52cf1rg1wQD7ZYOjJEj6-Y9lTnjsaJy5lxZAbKN9rEBmiP1CGm9Frmr7XLqZAseHK_auhcAR-SAxMNRzUZSWQW_sFfXURndsd9iHhJG4y_t0SpW7BaWNe1dWBd5cS4azA9t4izjZAJo6VmKzYo30zSVrWagR6x_nFiqRYywJG0dblySxHy7Kare35ER8lmc-HswwF99d-hoteM_zEgT1k7UlGoE2MDb1O1FHQ",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuB6t95jMyVtqtC9JIEAQRd9WhiiEyA-pzMrumdpp6Pecs8t2Rpuzx1OOYJi187geR9Cc_7U7avWIYY2txTFNx3Y93E_3nUCDHk9elW6JIWvuUJXSkAcXz-x-TMHUAjoaGXHrgqKscx_PzDIDttN4onWgNs5c7Re_qtxpKBjCxm_uTPCdkNmkOmt9qIC3HyCWPDVIKrlYFKi7VwTVyZNbZQRjuaSYLLsH3niBr0ArkUZP2TudTFEvHxlc7ouZklPLY81IhQGese1ayk",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDkzdIafosBD8taV_Sjxb11Fl8VxRzFzCQ_CX35UfaTFxI990DPZGi_6GWuQbN5VEV-HAooqc1fE7cgs2cVtM6Hama9cJvJyF-tQvLEz9ktl2TduCkT-BVJZdfUVjCZGEQ_U7JzOMArJHjTgpbEaEn38ELTHvng-bEKAgDS7R9wFEQVmUKBDS6vXJzfruhwkqet2WBzBO33hi0VQq6mysEiiCz7ckZsvPl89OHphzBNpCP-i9sfirJVQ-mEOxsEM2zEZUqVSoet-jQ",
];
const campaignImg = (i: number) => FALLBACK_IMGS[i % FALLBACK_IMGS.length];

function campaignBadge(c: CampaignListItem): { label: string; cls: string } {
  if (c.status === "paused")           return { label: "Paused",       cls: "bg-amber-100 text-amber-700" };
  if (c.status === "closed")           return { label: "Closed",       cls: "bg-slate-100 text-slate-500" };
  if ((c.progress_pct ?? 0) >= 75)     return { label: "Almost there", cls: "bg-emerald-100 text-emerald-700" };
  if ((c.progress_pct ?? 0) <= 15)     return { label: "Urgent",       cls: "bg-red-100 text-red-700" };
  if (c.donation_type === "recurring") return { label: "Monthly",      cls: "bg-blue-100 text-blue-700" };
  return { label: "Active", cls: "bg-white/90 text-[#003527]" };
}

const PRESETS = [10, 25, 50, 100, 250, 500];

// ─── Detail Drawer ────────────────────────────────────────────────────────────

function DetailDrawer({ campaign, masjidId, onClose, onDonate }: {
  campaign: CampaignListItem; masjidId: string;
  onClose: () => void; onDonate: () => void;
}) {
  const { campaignDetail, donations, loading, getCampaignDetail, getDonations, clearCampaignDetail, clearDonations } = useDonations();
  const [donPage, setDonPage] = useState(1);

  useEffect(() => {
    void getCampaignDetail(masjidId, campaign.id);
    void getDonations(masjidId, campaign.id, { page: 1, limit: 10 });
    return () => { clearCampaignDetail(); clearDonations(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [masjidId, campaign.id]);

  const detail   = campaignDetail?.data;
  const donList: DonationRecord[] = donations?.data?.data ?? [];
  const donMeta  = donations?.data?.metadata;
  const donTotal = donMeta?.total_data ?? 0;
  const donPages = Math.max(1, Math.ceil(donTotal / 10));

  return (
    <div
      data-testid="campaign-detail-drawer"
      className="fixed inset-0 z-50 flex"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div className="ml-auto w-full max-w-md bg-white h-full overflow-y-auto flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white z-10 px-6 pt-6 pb-4 border-b border-slate-100 flex items-center justify-between">
          <div className="min-w-0 pr-3">
            <p className="text-[10px] font-bold text-[#064e3b] uppercase tracking-widest mb-0.5">Campaign Detail</p>
            <h3 data-testid="detail-drawer-title" className="text-base font-extrabold text-slate-800 truncate" style={{ fontFamily: "Manrope, sans-serif" }}>{campaign.title}</h3>
          </div>
          <button data-testid="detail-drawer-close" onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-colors shrink-0">
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {loading && !detail ? (
          <div data-testid="detail-drawer-loading" className="flex items-center justify-center flex-1 py-20">
            <div className="w-10 h-10 rounded-full border-4 border-emerald-100 border-t-[#064e3b] animate-spin" />
          </div>
        ) : (
          <div className="flex-1 px-6 py-6 space-y-6">
            <div className="h-48 rounded-2xl overflow-hidden">
              <img src={campaignImg(0)} alt={campaign.title} className="w-full h-full object-cover" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-bold">
                <span className="text-[#064e3b]">{fmt(detail?.raised_amount ?? campaign.raised_amount, campaign.currency)}</span>
                <span className="text-slate-400">of {fmt(detail?.goal_amount ?? campaign.goal_amount, campaign.currency)}</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#003527] to-emerald-400 rounded-full"
                  style={{ width: `${Math.min(detail?.progress_pct ?? campaign.progress_pct ?? 0, 100)}%` }} />
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>{detail?.progress_pct ?? campaign.progress_pct ?? 0}% funded</span>
                <span>{detail?.donor_count ?? campaign.donor_count} donors</span>
              </div>
            </div>
            {detail?.description && <p className="text-sm text-slate-500 leading-relaxed">{detail.description}</p>}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Status",   value: (detail?.status ?? campaign.status).toUpperCase() },
                { label: "Type",     value: (detail?.donation_type ?? campaign.donation_type ?? "").replace("_", " ") },
                { label: "End Date", value: detail?.end_date ? new Date(detail.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—" },
                { label: "Currency", value: campaign.currency.toUpperCase() },
              ].map(({ label, value }) => (
                <div key={label} className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">{label}</p>
                  <p className="text-sm font-semibold text-slate-700 capitalize">{value}</p>
                </div>
              ))}
            </div>
            {campaign.status === "active" && (
              <button
                data-testid="detail-drawer-donate-button"
                onClick={onDonate}
                className="w-full py-4 rounded-xl font-extrabold text-base text-white shadow-lg hover:-translate-y-0.5 transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg, #003527, #064e3b)" }}>
                Donate Now
              </button>
            )}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-slate-700" style={{ fontFamily: "Manrope, sans-serif" }}>
                  Recent Donors ({donTotal})
                </h4>
                <button
                  data-testid="donors-refresh-button"
                  onClick={() => { setDonPage(1); void getDonations(masjidId, campaign.id, { page: 1, limit: 10 }); }}
                  className="text-[10px] font-bold text-[#064e3b] flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">refresh</span>Refresh
                </button>
              </div>
              {donList.length === 0 ? (
                <div data-testid="donors-empty-state" className="py-8 text-center text-slate-300">
                  <span className="material-symbols-outlined text-4xl block mb-2">volunteer_activism</span>
                  <p className="text-sm">No donations yet. Be the first!</p>
                </div>
              ) : (
                <div data-testid="donors-list" className="space-y-2">
                  {donList.map((d) => (
                    <div key={d.id} data-testid={`donor-row-${d.id}`} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-sm text-emerald-600">favorite</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-700 truncate">{d.user?.name ?? "Anonymous"}</p>
                          <p className="text-[11px] text-slate-400">{d.donated_at ? new Date(d.donated_at).toLocaleDateString() : "—"}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        {/* amount already in major units — no division needed */}
                        <p className="text-sm font-bold text-[#064e3b]">{fmt(d.amount, d.currency)}</p>
                        <span className={`text-[10px] font-bold uppercase ${d.status === "succeeded" ? "text-emerald-500" : d.status === "failed" ? "text-red-400" : "text-amber-500"}`}>{d.status}</span>
                      </div>
                    </div>
                  ))}
                  {donPages > 1 && (
                    <div className="flex items-center justify-between pt-2">
                      <button
                        data-testid="donors-prev-page"
                        onClick={() => { const p = Math.max(1, donPage - 1); setDonPage(p); void getDonations(masjidId, campaign.id, { page: p, limit: 10 }); }}
                        disabled={donPage === 1 || loading} className="text-xs font-bold text-slate-400 disabled:opacity-30 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">chevron_left</span> Prev
                      </button>
                      <span data-testid="donors-page-indicator" className="text-xs text-slate-400">{donPage} / {donPages}</span>
                      <button
                        data-testid="donors-next-page"
                        onClick={() => { const p = Math.min(donPages, donPage + 1); setDonPage(p); void getDonations(masjidId, campaign.id, { page: p, limit: 10 }); }}
                        disabled={donPage >= donPages || loading} className="text-xs font-bold text-slate-400 disabled:opacity-30 flex items-center gap-1">
                        Next <span className="material-symbols-outlined text-sm">chevron_right</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Donate Modal ─────────────────────────────────────────────────────────────

function DonateModal({ campaign, masjidId, onClose, onSuccess }: {
  campaign: CampaignListItem; masjidId: string;
  onClose: () => void; onSuccess: (title: string) => void;
}) {
  const { initiateDonation, loading, error, clearError } = useDonations();

  const canRecurring = campaign.donation_type === "recurring" || campaign.donation_type === "both";
  const canOneTime   = campaign.donation_type === "one_time"  || campaign.donation_type === "both";

  const [amount,          setAmount]          = useState<number>(25);
  const [custom,          setCustom]          = useState("");
  const [isRecurring,     setIsRecurring]     = useState(!canOneTime && canRecurring);
  const [interval,        setInterval]        = useState<DonationInterval>("month");

  const [clientSecret,    setClientSecret]    = useState<string | null>(null);
  const [stripeAccountId, setStripeAccountId] = useState<string>("");
  const [displayAmount,   setDisplayAmount]   = useState(0);

  // finalAmount is in major units (e.g. 25 = $25)
  const finalAmount = custom ? Number(custom) : amount;

  const handleDonate = useCallback(async () => {
    if (!finalAmount || finalAmount <= 0) return;
    clearError();

    const payload: InitiateDonationRequest = {
      amount:        finalAmount,  // ← major units, no * 100
      currency:      campaign.currency,
      donation_type: isRecurring ? "recurring" : "one_time",
      ...(isRecurring ? { interval } : {}),
    };

    const result = await initiateDonation(masjidId, campaign.id, payload);
    if (result?.data?.client_secret) {
      setDisplayAmount(result.data.amount);  // ← major units, no / 100
      setClientSecret(result.data.client_secret);
      setStripeAccountId(result.data.stripe_account_id ?? "");
    }
  }, [finalAmount, campaign, masjidId, isRecurring, interval, initiateDonation, clearError]);

  if (clientSecret) {
    return (
      <div data-testid="stripe-payment-step">
        <StripePaymentDrawer
          clientSecret={clientSecret}
          stripeAccountId={stripeAccountId}
          amount={displayAmount}
          currency={campaign.currency}
          campaignTitle={campaign.title}
          onSuccess={() => { setClientSecret(null); onSuccess(campaign.title); }}
          onCancel={() => setClientSecret(null)}
        />
      </div>
    );
  }

  return (
    <div
      data-testid="donate-modal"
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full md:max-w-md bg-white md:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col"
        style={{ maxHeight: "90dvh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-slate-100 shrink-0">
          <div>
            <p className="text-[10px] font-bold text-[#064e3b] uppercase tracking-widest mb-1">Donate</p>
            <h3 data-testid="donate-modal-title" className="text-lg font-extrabold text-slate-800 leading-tight" style={{ fontFamily: "Manrope, sans-serif" }}>{campaign.title}</h3>
          </div>
          <button data-testid="donate-modal-close" onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-colors shrink-0">
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold text-slate-500">
              <span>{fmt(campaign.raised_amount, campaign.currency)} raised</span>
              <span className="text-[#064e3b]">{campaign.progress_pct ?? 0}% of {fmt(campaign.goal_amount, campaign.currency)}</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#003527] to-emerald-400 rounded-full"
                style={{ width: `${Math.min(campaign.progress_pct ?? 0, 100)}%` }} />
            </div>
          </div>

          {campaign.donation_type === "both" && (
            <div data-testid="donation-type-toggle" className="flex bg-slate-100 rounded-xl p-1 gap-1">
              <button data-testid="donation-type-onetime" onClick={() => setIsRecurring(false)} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${!isRecurring ? "bg-white text-[#003527] shadow-sm" : "text-slate-400"}`}>One-time</button>
              <button data-testid="donation-type-monthly" onClick={() => setIsRecurring(true)}  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${ isRecurring ? "bg-white text-[#003527] shadow-sm" : "text-slate-400"}`}>Monthly</button>
            </div>
          )}

          {campaign.donation_type !== "both" && (
            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
              <span className="material-symbols-outlined text-sm">{canRecurring ? "autorenew" : "payments"}</span>
              {canRecurring ? "Recurring donations only" : "One-time donation"}
            </div>
          )}

          {(isRecurring || (!canOneTime && canRecurring)) && (
            <div data-testid="donation-interval-toggle" className="flex gap-2">
              {(["month", "year"] as DonationInterval[]).map((iv) => (
                <button key={iv} data-testid={`donation-interval-${iv}`} onClick={() => setInterval(iv)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${interval === iv ? "bg-[#003527] text-white border-[#003527]" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"}`}>
                  {iv === "month" ? "Monthly" : "Yearly"}
                </button>
              ))}
            </div>
          )}

          <div data-testid="amount-presets" className="grid grid-cols-3 gap-2">
            {PRESETS.map((p) => (
              <button key={p} data-testid={`amount-preset-${p}`} onClick={() => { setAmount(p); setCustom(""); }}
                className={`py-2.5 rounded-xl text-sm font-bold transition-all ${amount === p && !custom ? "bg-[#003527] text-white shadow-md" : "bg-slate-50 text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-100"}`}>
                {fmt(p, campaign.currency)}
              </button>
            ))}
          </div>

          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm pointer-events-none">
              {campaign.currency.toUpperCase() === "USD" ? "$" : campaign.currency.toUpperCase()}
            </span>
            <input
              data-testid="custom-amount-input"
              type="number" min="1" placeholder="Custom amount" value={custom}
              onChange={(e) => { setCustom(e.target.value); setAmount(0); }}
              className="w-full border border-slate-200 rounded-xl pl-8 pr-4 py-3 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30 focus:border-[#064e3b] transition-all" />
          </div>

          {error && (
            <div data-testid="donate-modal-error" className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-medium">
              <span className="material-symbols-outlined text-sm">error</span>{error}
            </div>
          )}
        </div>

        {/* Sticky footer */}
        <div className="p-6 pt-4 border-t border-slate-100 shrink-0 space-y-3">
          <button
            data-testid="donate-submit-button"
            onClick={handleDonate}
            disabled={loading || !finalAmount || finalAmount <= 0 || campaign.status !== "active"}
            className="w-full py-4 rounded-xl font-extrabold text-base text-white shadow-lg hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #003527, #064e3b)" }}>
            {loading ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Preparing payment…</>
            ) : campaign.status !== "active" ? "Campaign not active"
              : `Donate ${finalAmount > 0 ? fmt(finalAmount, campaign.currency) : ""} ${isRecurring || (!canOneTime && canRecurring) ? `/ ${interval}` : ""}`
            }
          </button>
          <p className="text-[10px] text-slate-400 text-center">Secured by Stripe · PCI DSS Level 1 · 256-bit TLS</p>
        </div>
      </div>
    </div>
  );
}

// ─── Campaign Card ────────────────────────────────────────────────────────────

function CampaignCard({ campaign, index, onDonate, onDetail }: {
  campaign: CampaignListItem; index: number;
  onDonate: (c: CampaignListItem) => void; onDetail: (c: CampaignListItem) => void;
}) {
  const badge     = campaignBadge(campaign);
  const canDonate = campaign.status === "active";
  return (
    <div data-testid={`campaign-card-${campaign.id}`} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 flex flex-col group hover:-translate-y-1 transition-transform duration-300">
      <div className="h-48 relative overflow-hidden">
        <img src={campaignImg(index)} alt={campaign.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        <div data-testid="campaign-card-badge" className={`absolute top-4 right-4 px-3 py-1 rounded-full text-[10px] font-bold uppercase ${badge.cls}`}>{badge.label}</div>
        <button data-testid="campaign-card-info-button" onClick={() => onDetail(campaign)} className="absolute top-4 left-4 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-slate-600 hover:bg-white hover:text-[#003527] transition-colors opacity-0 group-hover:opacity-100">
          <span className="material-symbols-outlined text-sm">info</span>
        </button>
      </div>
      <div className="p-6 flex-1 flex flex-col">
        <h3 data-testid="campaign-card-title" className="text-lg font-bold text-slate-800 mb-1.5" style={{ fontFamily: "Manrope, sans-serif" }}>{campaign.title}</h3>
        <p className="text-slate-400 text-sm mb-6">{campaign.donor_count > 0 ? `${campaign.donor_count.toLocaleString()} donor${campaign.donor_count !== 1 ? "s" : ""} have contributed` : "Be the first to contribute"}</p>
        <div className="mt-auto space-y-4">
          <div>
            <div className="flex justify-between text-xs font-bold mb-1.5">
              <span className="text-slate-600">Progress</span>
              <span className="text-[#064e3b]">{campaign.progress_pct ?? 0}%</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div className="h-full bg-[#064e3b] rounded-full" style={{ width: `${Math.min(campaign.progress_pct ?? 0, 100)}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-400">
              <span className="font-bold text-slate-700">{fmt(campaign.raised_amount, campaign.currency)}</span> raised of {fmt(campaign.goal_amount, campaign.currency)}
            </p>
          </div>
          <div className="flex gap-2">
            <button data-testid="campaign-card-details-button" onClick={() => onDetail(campaign)} className="flex-1 py-3 rounded-xl font-bold text-sm border border-slate-200 text-slate-600 hover:border-[#064e3b] hover:text-[#064e3b] transition-all">Details</button>
            <button
              data-testid="campaign-card-donate-button"
              onClick={() => canDonate && onDonate(campaign)} disabled={!canDonate}
              className="flex-[2] py-3 rounded-xl font-bold text-sm text-white shadow-md hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
              style={{ background: canDonate ? "linear-gradient(135deg, #003527, #064e3b)" : undefined, backgroundColor: canDonate ? undefined : "#94a3b8" }}>
              {canDonate ? "Donate Now" : campaign.status === "paused" ? "Paused" : "Closed"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DonationHubPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: masjidId } = use(params);
  const { campaigns, loading, error, getCampaigns, clearError } = useDonations();

  const [statusFilter,     setStatusFilter]     = useState<"all" | CampaignStatus>("all");
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignListItem | null>(null);
  const [detailCampaign,   setDetailCampaign]   = useState<CampaignListItem | null>(null);
  const [successMsg,       setSuccessMsg]       = useState<string | null>(null);

  useEffect(() => {
    if (masjidId) void getCampaigns(masjidId, { status: statusFilter === "all" ? undefined : statusFilter });
  }, [masjidId, statusFilter, getCampaigns]);

  const allCampaigns = campaigns?.data ?? [];
  const featured = allCampaigns.filter((c) => c.status === "active").sort((a, b) => (b.progress_pct ?? 0) - (a.progress_pct ?? 0))[0] ?? null;
  const grid = allCampaigns.filter((c) => c.id !== featured?.id);

  const handleDonateSuccess = useCallback((title: string) => {
    setSelectedCampaign(null);
    setDetailCampaign(null);
    setSuccessMsg(`JazakAllah Khayr! Your donation to "${title}" is confirmed.`);
    setTimeout(() => setSuccessMsg(null), 5000);
    void getCampaigns(masjidId, { status: statusFilter === "all" ? undefined : statusFilter });
  }, [masjidId, statusFilter, getCampaigns]);

  const FILTERS: Array<{ label: string; value: "all" | CampaignStatus }> = [
    { label: "All",    value: "all"    },
    { label: "Active", value: "active" },
    { label: "Paused", value: "paused" },
    { label: "Closed", value: "closed" },
  ];

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      <style>{`.material-symbols-outlined{font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24;vertical-align:middle}`}</style>

      {successMsg && (
        <div data-testid="donation-success-toast" className="fixed top-5 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-2.5 bg-[#003527] text-white px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold max-w-sm w-full mx-4">
          <span className="material-symbols-outlined text-emerald-400">check_circle</span>{successMsg}
        </div>
      )}

      <div data-testid="donation-hub-page" className="min-h-screen bg-[#f2f3ff] pb-28 md:pb-10" style={{ fontFamily: "DM Sans, sans-serif" }}>
        <section className="px-6 md:px-12 py-10">
          <div className="max-w-6xl mx-auto space-y-10">

            <header className="space-y-4">
              <p className="text-xs font-bold text-[#064e3b] uppercase tracking-widest">Community Giving</p>
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>Donation Hub</h1>
                  <p className="text-slate-500 text-lg mt-1">Support our community projects and earn continuous rewards (Sadaqah Jariyah).</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-400 font-medium">Filter:</span>
                  <div data-testid="status-filter-group" className="flex bg-white rounded-full p-1 shadow-sm border border-slate-100">
                    {FILTERS.map((f) => (
                      <button key={f.value} data-testid={`status-filter-${f.value}`} onClick={() => setStatusFilter(f.value)}
                        aria-pressed={statusFilter === f.value}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${statusFilter === f.value ? "bg-emerald-100 text-[#003527] shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </header>

            {loading && allCampaigns.length === 0 && (
              <div data-testid="campaigns-loading" className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-12 h-12 rounded-full border-4 border-emerald-100 border-t-[#064e3b] animate-spin" />
                <p className="text-slate-400 text-sm font-medium">Loading campaigns…</p>
              </div>
            )}

            {error && allCampaigns.length === 0 && (
              <div data-testid="campaigns-error-state" className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <span className="material-symbols-outlined text-4xl text-red-300">error</span>
                <p className="text-slate-500 font-semibold text-sm">Could not load campaigns</p>
                <p className="text-slate-400 text-xs">{error}</p>
                <button data-testid="campaigns-error-retry" onClick={() => { clearError(); void getCampaigns(masjidId, {}); }}
                  className="mt-2 px-4 py-2 rounded-xl bg-[#003527] text-white text-xs font-bold hover:bg-[#064e3b] transition-colors">Try again</button>
              </div>
            )}

            {allCampaigns.length > 0 && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {featured ? (
                    <div data-testid="featured-campaign" className="lg:col-span-2 relative group overflow-hidden rounded-2xl h-[380px] bg-[#003527] shadow-lg cursor-pointer" onClick={() => setDetailCampaign(featured)}>
                      <img src={campaignImg(0)} alt={featured.title} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#003527] via-transparent to-transparent" />
                      <div className="absolute bottom-0 p-8 w-full">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="bg-white/20 backdrop-blur px-3 py-1 rounded-full text-[10px] text-white font-bold uppercase tracking-widest">Active Now</span>
                          <span className="text-white/70 text-xs font-medium">{featured.progress_pct ?? 0}% Completed</span>
                        </div>
                        <h2 data-testid="featured-campaign-title" className="text-3xl font-bold text-white mb-4" style={{ fontFamily: "Manrope, sans-serif" }}>{featured.title}</h2>
                        <div className="max-w-md space-y-4">
                          <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-300 rounded-full" style={{ width: `${Math.min(featured.progress_pct ?? 0, 100)}%` }} />
                          </div>
                          <div className="flex justify-between items-end">
                            <div className="text-white">
                              <span className="text-2xl font-bold">{fmt(featured.raised_amount, featured.currency)}</span>
                              <span className="text-white/60 text-sm ml-2">of {fmt(featured.goal_amount, featured.currency)} raised</span>
                            </div>
                            <button
                              data-testid="featured-campaign-donate-button"
                              onClick={(e) => { e.stopPropagation(); setSelectedCampaign(featured); }}
                              className="bg-white text-[#003527] px-7 py-2.5 rounded-xl font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all active:scale-95">
                              Donate Now
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div data-testid="featured-campaign-empty" className="lg:col-span-2 rounded-2xl h-[380px] bg-[#003527] shadow-lg flex items-center justify-center">
                      <div className="text-center text-white/60 space-y-2 p-8">
                        <span className="material-symbols-outlined text-5xl block">volunteer_activism</span>
                        <p className="font-semibold">No active featured campaign</p>
                      </div>
                    </div>
                  )}
                  <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 flex flex-col justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 mb-6" style={{ fontFamily: "Manrope, sans-serif" }}>Campaign Overview</h3>
                      <div className="space-y-6">
                        {[
                          { icon: "campaign", bg: "bg-emerald-100", color: "text-[#064e3b]", value: allCampaigns.filter((c) => c.status === "active").length, label: "Active Campaigns" },
                          { icon: "group", bg: "bg-blue-100", color: "text-blue-800", value: allCampaigns.reduce((s, c) => s + (c.donor_count ?? 0), 0).toLocaleString(), label: "Total Donors" },
                          { icon: "payments", bg: "bg-violet-100", color: "text-violet-700", value: fmt(allCampaigns.reduce((s, c) => s + (c.raised_amount ?? 0), 0), allCampaigns[0]?.currency ?? "USD"), label: "Total Raised" },
                        ].map(({ icon, bg, color, value, label }) => (
                          <div key={label} data-testid={`overview-stat-${label.toLowerCase().replace(/\s+/g, "-")}`} className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full ${bg} flex items-center justify-center ${color}`}>
                              <span className="material-symbols-outlined">{icon}</span>
                            </div>
                            <div>
                              <div className="text-2xl font-bold text-slate-800" style={{ fontFamily: "Manrope, sans-serif" }}>{value}</div>
                              <div className="text-xs text-slate-400 uppercase font-bold tracking-tight">{label}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="pt-6 border-t border-slate-100">
                      <p className="text-[#064e3b] font-bold text-sm flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">info</span>
                        {campaigns?.metadata.total_data ?? allCampaigns.length} campaigns total
                      </p>
                    </div>
                  </div>
                </div>

                {grid.length > 0 && (
                  <div data-testid="campaigns-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {grid.map((c, i) => (
                      <CampaignCard key={c.id} campaign={c} index={i + 1}
                        onDonate={setSelectedCampaign} onDetail={setDetailCampaign} />
                    ))}
                  </div>
                )}

                {campaigns?.metadata && campaigns.metadata.page < campaigns.metadata.total_page && (
                  <div className="flex justify-center">
                    <button
                      data-testid="campaigns-load-more"
                      onClick={() => void getCampaigns(masjidId, { status: statusFilter === "all" ? undefined : statusFilter, page: campaigns.metadata.page + 1 })}
                      disabled={loading}
                      className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:border-[#064e3b] hover:text-[#064e3b] transition-all disabled:opacity-50">
                      {loading ? <span className="w-4 h-4 border-2 border-slate-300 border-t-[#064e3b] rounded-full animate-spin" /> : <span className="material-symbols-outlined text-base">expand_more</span>}
                      Load more campaigns
                    </button>
                  </div>
                )}

                <div className="p-8 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-[#064e3b] shadow-sm">
                      <span className="material-symbols-outlined text-2xl">autorenew</span>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-800" style={{ fontFamily: "Manrope, sans-serif" }}>Recurring Support</h4>
                      <p className="text-slate-400 text-sm">Automate your rewards with a monthly subscription.</p>
                    </div>
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    {allCampaigns.find((c) => (c.donation_type === "recurring" || c.donation_type === "both") && c.status === "active") && (
                      <button
                        data-testid="setup-monthly-button"
                        onClick={() => { const c = allCampaigns.find((c) => (c.donation_type === "recurring" || c.donation_type === "both") && c.status === "active"); if (c) setSelectedCampaign(c); }}
                        className="px-6 py-2.5 rounded-xl border-2 border-[#064e3b] text-[#064e3b] font-bold text-sm hover:bg-[#064e3b] hover:text-white transition-all">
                        Setup Monthly
                      </button>
                    )}
                    <button className="px-6 py-2.5 rounded-xl bg-slate-800 text-white font-bold text-sm hover:opacity-90 transition-all">Contact Admin</button>
                  </div>
                </div>
              </>
            )}

            {!loading && !error && allCampaigns.length === 0 && (
              <div data-testid="campaigns-empty-state" className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center">
                  <span className="material-symbols-outlined text-4xl text-emerald-300">volunteer_activism</span>
                </div>
                <h3 className="text-lg font-bold text-slate-600" style={{ fontFamily: "Manrope, sans-serif" }}>No campaigns yet</h3>
                <p className="text-slate-400 text-sm max-w-xs">This masjid hasn't launched any donation campaigns yet. Check back soon.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-100 px-4 py-2 z-50 shadow-lg">
        <div className="flex justify-between items-center max-w-md mx-auto">
          {[{ icon: "dashboard", label: "Home", active: false }, { icon: "volunteer_activism", label: "Donate", active: true }].map((item) => (
            <a key={item.label} href="#" className={`flex flex-col items-center p-2 ${item.active ? "text-[#064e3b]" : "text-slate-400"}`}>
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </a>
          ))}
          <div className="relative -top-5">
            <button
              data-testid="mobile-quick-donate-button"
              onClick={() => featured && setSelectedCampaign(featured)}
              className="w-14 h-14 text-white rounded-full shadow-lg flex items-center justify-center ring-4 ring-white"
              style={{ background: "linear-gradient(135deg, #003527, #064e3b)" }}>
              <span className="material-symbols-outlined text-2xl">add</span>
            </button>
          </div>
          {[{ icon: "receipt_long", label: "History" }, { icon: "settings", label: "Settings" }].map((item) => (
            <a key={item.label} href="#" className="flex flex-col items-center p-2 text-slate-400">
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </a>
          ))}
        </div>
      </nav>

      {detailCampaign && !selectedCampaign && (
        <DetailDrawer campaign={detailCampaign} masjidId={masjidId}
          onClose={() => setDetailCampaign(null)}
          onDonate={() => { setSelectedCampaign(detailCampaign); setDetailCampaign(null); }} />
      )}

      {selectedCampaign && (
        <DonateModal campaign={selectedCampaign} masjidId={masjidId}
          onClose={() => setSelectedCampaign(null)}
          onSuccess={handleDonateSuccess} />
      )}
    </>
  );
}
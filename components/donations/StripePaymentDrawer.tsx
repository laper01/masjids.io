/**
 * components/donations/StripePaymentDrawer.tsx
 * Stripe Elements integration — renders card form inside app
 * Requires: npm install @stripe/stripe-js @stripe/react-stripe-js
 */
"use client";

import { useMemo, useState, useCallback } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

// ─── Inner form (must be inside <Elements>) ───────────────────────────────────

interface CheckoutFormProps {
  amount:        number;
  currency:      string;
  campaignTitle: string;
  onSuccess:     () => void;
  onCancel:      () => void;
}

function CheckoutForm({
  amount, currency, campaignTitle, onSuccess, onCancel,
}: CheckoutFormProps) {
  const stripe   = useStripe();
  const elements = useElements();

  const [isProcessing, setIsProcessing] = useState(false);
  const [stripeError,  setStripeError]  = useState<string | null>(null);
  const [done,         setDone]         = useState(false);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency", currency: currency.toUpperCase(),
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(n);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setStripeError(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/donations/success`,
      },
      redirect: "if_required",
    });

    if (error) {
      setStripeError(error.message ?? "Payment failed.");
      setIsProcessing(false);
    } else {
      setDone(true);
      setTimeout(onSuccess, 2000);
    }
  }, [stripe, elements, onSuccess]);

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-8 text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
          <span className="material-symbols-outlined text-4xl text-emerald-600">check_circle</span>
        </div>
        <h3 className="text-xl font-extrabold text-slate-800" style={{ fontFamily: "Manrope, sans-serif" }}>
          JazakAllah Khayr!
        </h3>
        <p className="text-slate-500 text-sm">
          Your {fmt(amount)} donation to <strong>{campaignTitle}</strong> is confirmed.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
      {/* ── Scrollable body ── */}
      <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
        {/* Amount badge */}
        <div className="bg-emerald-50 rounded-xl px-4 py-3 text-sm text-[#064e3b] font-semibold flex items-center justify-between">
          <span>Donation amount</span>
          <span className="text-lg font-extrabold">{fmt(amount)}</span>
        </div>

        {/* Stripe PaymentElement */}
        <PaymentElement
          options={{
            layout: "tabs",
            paymentMethodOrder: ["card", "apple_pay", "google_pay"],
          }}
        />

        {stripeError && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-medium">
            <span className="material-symbols-outlined text-sm">error</span>
            {stripeError}
          </div>
        )}
      </div>

      {/* ── Sticky footer ── */}
      <div className="px-6 pb-6 pt-4 border-t border-slate-100 shrink-0 space-y-3">
        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className="w-full py-4 rounded-xl font-extrabold text-base text-white shadow-lg hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(135deg, #003527, #064e3b)" }}
        >
          {isProcessing ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Processing…
            </>
          ) : (
            `Pay ${fmt(amount)}`
          )}
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="w-full py-2 text-sm text-slate-400 hover:text-slate-600 transition-colors font-medium"
        >
          Cancel
        </button>

        <p className="text-[10px] text-slate-400 text-center">
          Secured by Stripe · PCI DSS Level 1 · 256-bit TLS
        </p>
      </div>
    </form>
  );
}

// ─── Outer wrapper ────────────────────────────────────────────────────────────

interface StripePaymentDrawerProps {
  clientSecret:    string;
  stripeAccountId: string;
  amount:          number;
  currency:        string;
  campaignTitle:   string;
  onSuccess:       () => void;
  onCancel:        () => void;
}

export function StripePaymentDrawer({
  clientSecret, stripeAccountId, amount, currency, campaignTitle, onSuccess, onCancel,
}: StripePaymentDrawerProps) {
  const stripePromise = useMemo(
    () => loadStripe(
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
      { stripeAccount: stripeAccountId }
    ),
    [stripeAccountId]
  );

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-0 md:p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
      onClick={onCancel}
    >
      {/* Modal container — max height + flex column */}
      <div
        className="relative w-full md:max-w-md bg-white md:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col"
        style={{ maxHeight: "90dvh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Sticky header ── */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
          <div>
            <p className="text-[10px] font-bold text-[#064e3b] uppercase tracking-widest mb-0.5">
              Secure Payment
            </p>
            <h3
              className="text-base font-extrabold text-slate-800 truncate"
              style={{ fontFamily: "Manrope, sans-serif" }}
            >
              {campaignTitle}
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {/* Stripe Elements — flex-1 so it fills remaining height */}
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: {
              theme: "stripe",
              variables: {
                colorPrimary:    "#003527",
                colorBackground: "#ffffff",
                colorText:       "#1e293b",
                colorDanger:     "#dc2626",
                fontFamily:      "DM Sans, system-ui, sans-serif",
                borderRadius:    "12px",
                spacingUnit:     "4px",
              },
            },
          }}
        >
          <CheckoutForm
            amount={amount}
            currency={currency}
            campaignTitle={campaignTitle}
            onSuccess={onSuccess}
            onCancel={onCancel}
          />
        </Elements>
      </div>
    </div>
  );
}
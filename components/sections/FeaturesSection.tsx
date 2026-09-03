"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { CheckCircle2, AlertCircle, Shield } from "lucide-react";

/* ─── Animation helpers ─────────────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

/* ─── Governance Card ────────────────────────────────────────────── */
function GovernanceCard() {
  const rows = [
    { role: "Imam", lastMod: "Jan 12", forward: true, autoSend: true },
    { role: "Dean", lastMod: "—", forward: false, autoSend: true },
    { role: "Treasurer", lastMod: "Feb 4", forward: true, autoSend: false },
  ];

  return (
    <div className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-card">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center">
          <Shield size={14} className="text-neutral-600" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-semibold text-neutral-900">Governance</p>
          <p className="text-[11px] text-neutral-400">
            Manage complex hierarchies with our Permissions Matrix. Trust, verified.
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-neutral-100">
        <table className="w-full text-xs" aria-label="Governance permissions table">
          <thead>
            <tr className="bg-neutral-50">
              <th className="text-left px-3 py-2 text-neutral-400 font-medium">Role</th>
              <th className="text-left px-3 py-2 text-neutral-400 font-medium">Last Mod</th>
              <th className="px-3 py-2 text-neutral-400 font-medium text-center">Forward</th>
              <th className="px-3 py-2 text-neutral-400 font-medium text-center">Auto Send</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {rows.map((r) => (
              <tr key={r.role} className="hover:bg-neutral-50/60 transition-colors">
                <td className="px-3 py-2.5 font-medium text-neutral-700">{r.role}</td>
                <td className="px-3 py-2.5 text-neutral-400">{r.lastMod}</td>
                <td className="px-3 py-2.5 text-center">
                  {r.forward ? (
                    <CheckCircle2 size={13} className="text-brand-green mx-auto" aria-label="Enabled" />
                  ) : (
                    <span className="text-neutral-200" aria-label="Disabled">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-center">
                  {r.autoSend ? (
                    <CheckCircle2 size={13} className="text-brand-green mx-auto" aria-label="Enabled" />
                  ) : (
                    <span className="text-neutral-200" aria-label="Disabled">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Financial Card ─────────────────────────────────────────────── */
function FinancialCard() {
  return (
    <div className="bg-neutral-900 rounded-2xl p-5 text-white shadow-navy-glow">
      <p className="text-xs text-white/50 mb-1 font-medium uppercase tracking-wider">Financial Sanctuary</p>
      <p className="text-[11px] text-white/35 mb-5 leading-relaxed">
        Secure, Stripe-powered donation infrastructure.
      </p>

      {/* Expansion Fund */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-medium text-white/60 uppercase tracking-wider">
            Expansion Fund
          </span>
          <span className="text-xs font-semibold text-brand-green">88%</span>
        </div>
        <div
          className="h-2 bg-white/10 rounded-full overflow-hidden"
          role="progressbar"
          aria-label="Expansion fund progress: 88%"
          aria-valuenow={88}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: "88%" }}
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
            viewport={{ once: true }}
            className="h-full bg-brand-green rounded-full"
          />
        </div>
        <div className="flex justify-between items-center mt-1.5">
          <span className="text-[11px] text-white/40">$410,000</span>
          <span className="text-[11px] text-white/30">Goal: $500k</span>
        </div>
      </div>

      {/* Amount badge */}
      <div className="flex items-center gap-2">
        <span className="px-3 py-1.5 bg-white/10 rounded-lg text-sm font-bold">
          $410,000
        </span>
        <span className="text-xs text-white/30">raised this cycle</span>
      </div>
    </div>
  );
}

/* ─── Ping Engine Card ───────────────────────────────────────────── */
function PingEngineCard() {
  return (
    <div className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
            <AlertCircle size={14} className="text-red-500" aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold text-neutral-900">Ping Engine</p>
        </div>
        <span className="text-[10px] font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
          LIVE
        </span>
      </div>

      <div className="space-y-2.5">
        <div className="flex items-start gap-2.5">
          <span className="text-[10px] font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded mt-0.5 shrink-0">
            URGENT
          </span>
          <div>
            <p className="text-xs font-medium text-neutral-800">Volunteers needed for iftar distribution</p>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded mt-0.5 shrink-0">
            INFO
          </span>
          <div>
            <p className="text-xs text-neutral-500">112 others responding</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Member Profile Card ────────────────────────────────────────── */
function MemberCard() {
  return (
    <div className="bg-neutral-900 rounded-2xl p-5 text-white shadow-navy-glow">
      <div className="flex items-center gap-3 mb-5">
        {/* Avatar */}
        <div
          className="w-11 h-11 rounded-full bg-gradient-to-br from-brand-green to-brand-green-dark flex items-center justify-center text-white font-bold text-base shrink-0"
          aria-hidden="true"
        >
          OF
        </div>
        <div>
          <p className="text-sm font-semibold">Omar Farook</p>
          <p className="text-[11px] text-white/40">Community Leader • Platinum Member</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/8 rounded-xl p-3">
          <p className="text-[10px] text-white/40 mb-1 uppercase tracking-wider">Impact</p>
          <p className="text-xl font-bold">124 hrs</p>
        </div>
        <div className="bg-white/8 rounded-xl p-3">
          <p className="text-[10px] text-white/40 mb-1 uppercase tracking-wider">Donated</p>
          <p className="text-xl font-bold text-brand-green">$12.4k</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Features Section ───────────────────────────────────────────── */
export default function FeaturesSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      id="platform"
      ref={ref}
      aria-labelledby="features-heading"
      className="py-24 px-4 sm:px-6 bg-neutral-50/60"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial="hidden"
          animate={inView ? "show" : "hidden"}
          variants={fadeUp}
          custom={0}
          className="max-w-xl mb-14"
        >
          <h2
            id="features-heading"
            className="text-3xl sm:text-4xl font-bold text-neutral-900 tracking-tight"
          >
            Built for Sacred Scale
          </h2>
          <p className="mt-3 text-neutral-500 leading-relaxed">
            Powerful tools designed with the spiritual and operational needs of a
            modern community in mind.
          </p>
        </motion.div>

        {/* Card grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Row 1 */}
          <motion.div
            initial="hidden"
            animate={inView ? "show" : "hidden"}
            variants={fadeUp}
            custom={1}
          >
            <GovernanceCard />
          </motion.div>

          <motion.div
            initial="hidden"
            animate={inView ? "show" : "hidden"}
            variants={fadeUp}
            custom={2}
          >
            <FinancialCard />
          </motion.div>

          {/* Row 2 */}
          <motion.div
            initial="hidden"
            animate={inView ? "show" : "hidden"}
            variants={fadeUp}
            custom={3}
          >
            <PingEngineCard />
          </motion.div>

          <motion.div
            initial="hidden"
            animate={inView ? "show" : "hidden"}
            variants={fadeUp}
            custom={4}
          >
            <MemberCard />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

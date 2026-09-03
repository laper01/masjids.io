"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

// --- Animation helpers ---
const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1], delay },
  }),
};

// --- GovernanceCard ---
function GovernanceCard() {
  return (
    <div className="md:col-span-7 lg:col-span-8 bg-white rounded-3xl p-10 premium-shadow border border-slate-200/60 flex flex-col justify-between hover-lift relative overflow-hidden group">
      {/* Soft glow background */}
      <div
        className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-3xl opacity-50 -mr-32 -mt-32"
        aria-hidden="true"
      />

      <div className="relative">
        {/* Icon */}
        <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-8 border border-emerald-100">
          <span className="material-symbols-outlined text-primary text-3xl" aria-hidden="true">
            verified_user
          </span>
        </div>
        <h3 className="font-headline text-3xl font-bold text-slate-900 mb-4 tracking-tight">
          Advanced Governance
        </h3>
        <p className="text-slate-500 text-lg mb-10 max-w-md">
          Fine-tuned permission matrices ensuring every role is empowered and
          every action is accountable.
        </p>
      </div>

      {/* Permissions table */}
      <div className="relative bg-slate-50 rounded-2xl border border-slate-200 p-6 overflow-x-auto">
        <table className="w-full text-left text-sm" aria-label="Role permissions matrix">
          <thead>
            <tr className="text-slate-400 font-bold uppercase text-[10px] tracking-widest border-b border-slate-200">
              <th className="pb-4 font-bold" scope="col">Trustee Role</th>
              <th className="pb-4 font-bold" scope="col">Treasury</th>
              <th className="pb-4 font-bold" scope="col">Platform</th>
              <th className="pb-4 font-bold" scope="col">Elections</th>
            </tr>
          </thead>
          <tbody className="text-slate-600 font-medium">
            <tr className="border-b border-slate-100">
              <td className="py-4 font-bold text-slate-900">President</td>
              <td className="py-4">
                <span className="text-emerald-500 material-symbols-outlined" aria-label="Allowed">check_circle</span>
              </td>
              <td className="py-4">
                <span className="text-emerald-500 material-symbols-outlined" aria-label="Allowed">check_circle</span>
              </td>
              <td className="py-4">
                <span className="text-emerald-500 material-symbols-outlined" aria-label="Allowed">check_circle</span>
              </td>
            </tr>
            <tr>
              <td className="py-4 font-bold text-slate-900">Admin</td>
              <td className="py-4">
                <span className="text-slate-300 material-symbols-outlined" aria-label="Not allowed">cancel</span>
              </td>
              <td className="py-4">
                <span className="text-emerald-500 material-symbols-outlined" aria-label="Allowed">check_circle</span>
              </td>
              <td className="py-4">
                <span className="text-slate-300 material-symbols-outlined" aria-label="Not allowed">cancel</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- FinancialCard ---
function FinancialCard() {
  return (
    <div className="md:col-span-5 lg:col-span-4 bg-primary text-white rounded-3xl p-10 premium-shadow flex flex-col justify-between hover-lift relative overflow-hidden">
      <div className="absolute inset-0 geometric-pattern opacity-10" aria-hidden="true" />
      <div className="relative">
        <h3 className="font-headline text-3xl font-bold mb-4 tracking-tight">
          Financial Sanctuary
        </h3>
        <p className="text-emerald-100/80 text-lg">
          Secure, Stripe-powered donation infrastructure designed for
          transparency.
        </p>
      </div>

      <div className="relative mt-12 space-y-8">
        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs font-bold uppercase tracking-widest mb-3 text-emerald-200">
            <span>Ramadan Appeal</span>
            <span>92%</span>
          </div>
          <div
            className="w-full h-4 bg-white/10 rounded-full overflow-hidden border border-white/5"
            role="progressbar"
            aria-valuenow={92}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Ramadan appeal: 92% funded"
          >
            <div className="h-full bg-white w-[92%] rounded-full" />
          </div>
        </div>

        {/* Amount collected */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-emerald-300 uppercase">Collected</p>
            <p className="text-3xl font-extrabold">$842k</p>
          </div>
          <span className="material-symbols-outlined text-4xl text-emerald-300/50" aria-hidden="true">
            payments
          </span>
        </div>
      </div>
    </div>
  );
}

// --- PingEngineCard ---
function PingEngineCard() {
  return (
    <div className="md:col-span-5 bg-white rounded-3xl p-10 border border-slate-200/60 premium-shadow hover-lift flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <h3 className="font-headline text-2xl font-bold text-slate-900">Ping Engine</h3>
        <span
          className="px-3 py-1 rounded-full bg-red-50 text-red-600 text-[10px] font-bold animate-pulse border border-red-100"
          aria-label="Real-time updates active"
        >
          REALTIME
        </span>
      </div>

      <div className="flex-1 space-y-4">
        {/* Notification item */}
        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 relative">
          <div className="flex justify-between mb-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Urgent: Volunteer
            </p>
            <span className="text-[10px] text-slate-400">2m ago</span>
          </div>
          <p className="text-slate-900 font-bold mb-4">
            Urgent support needed for Janaza services at 2 PM.
          </p>
          {/* Avatar stack */}
          <div className="flex -space-x-3" aria-label="14 volunteers responding">
            <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-200" aria-hidden="true" />
            <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-300" aria-hidden="true" />
            <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-400" aria-hidden="true" />
            <div className="w-8 h-8 rounded-full border-2 border-white bg-primary flex items-center justify-center text-[10px] font-bold text-white">
              +14
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- MemberCard ---
function MemberCard() {
  return (
    <div className="md:col-span-7 bg-slate-900 text-white rounded-3xl p-10 premium-shadow hover-lift flex items-center gap-8 overflow-hidden relative">
      {/* Glow orb */}
      <div
        className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-[100px] -mr-48 -mt-48"
        aria-hidden="true"
      />

      {/* Member avatar */}
      <div className="relative flex-shrink-0">
        <img
          alt="Omar Farook — Verified Community Leader"
          className="w-28 h-28 rounded-2xl object-cover border-2 border-white/10"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuB8VUJvTzXibh54RFLy-nokQijXf-UOmzm0vQNtivcaVKfnuoOXCgBgVkhQB57QPJQaTTjbhA7-2OkeAskJ7L-Qe3fvxe02yZVI6GRaZ1IP8zwvb8grYgOqBO5EdN_sl3L8JvH6n_dN1YKqH900PKJnA4qm0aqRQFUeANePcJJ95vORn9JcumDGE4st9wQB7CqKN1KDLhzn0jF3ywJE1Ty0b904kZPEb0N1DmDvLjT5jybuBB4MzB4HMTLkJsbvOtBlhN-M6yBpPto"
        />
        {/* Verified badge */}
        <div
          className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center border-4 border-slate-900"
          aria-hidden="true"
        >
          <span className="material-symbols-outlined text-[14px] text-white">grade</span>
        </div>
      </div>

      {/* Member info */}
      <div className="relative flex-1">
        <div className="mb-6">
          <h4 className="text-2xl font-bold font-headline mb-1">Omar Farook</h4>
          <p className="text-slate-400 text-sm font-medium">Verified Community Leader</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/5 p-4 rounded-xl border border-white/10">
            <p className="text-[10px] uppercase text-emerald-400 font-bold mb-1 tracking-widest">
              Impact Score
            </p>
            <p className="text-2xl font-extrabold">98.4</p>
          </div>
          <div className="bg-white/5 p-4 rounded-xl border border-white/10">
            <p className="text-[10px] uppercase text-emerald-400 font-bold mb-1 tracking-widest">
              Trust Level
            </p>
            <p className="text-2xl font-extrabold">Tier 1</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- BentoGrid Section ---
export default function BentoGrid() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      ref={ref}
      className="py-32 bg-slate-50 relative"
      aria-labelledby="bento-heading"
    >
      <div className="max-w-7xl mx-auto px-8">
        {/* Section header */}
        <motion.div
          className="mb-20 text-center"
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={fadeUp}
          custom={0}
        >
          <h2
            id="bento-heading"
            className="font-headline text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight"
          >
            Built for Sacred Scale
          </h2>
          <p className="text-slate-500 max-w-2xl mx-auto text-lg leading-relaxed font-medium">
            Enterprise-grade tools reimagined for spiritual communities,
            combining modern efficiency with traditional values.
          </p>
        </motion.div>

        {/* Bento grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-12 gap-8"
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
        >
          <GovernanceCard />
          <FinancialCard />
          <PingEngineCard />
          <MemberCard />
        </motion.div>
      </div>
    </section>
  );
}

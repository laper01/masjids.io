"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Vote, Lock, UserCheck } from "lucide-react";

/* ─── Step data ─────────────────────────────────────────────────── */
const STEPS = [
  {
    number: "1",
    label: "Cast Vote",
    icon: Vote,
    description: "Encrypted, verifiable voting for community leaders.",
  },
  {
    number: "2",
    label: "Election Closed",
    icon: Lock,
    description: "Smart-contracts finalize the results automatically.",
  },
  {
    number: "3",
    label: "Auto-assigned",
    icon: UserCheck,
    description: "Permissions updated instantly based on verified roles.",
  },
] as const;

/* ─── Trust Section ─────────────────────────────────────────────── */
export default function TrustSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section
      id="community"
      ref={ref}
      aria-labelledby="trust-heading"
      className="py-24 px-4 sm:px-6 bg-neutral-50/70"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="text-center mb-16"
        >
          <h2
            id="trust-heading"
            className="text-3xl sm:text-4xl font-bold text-neutral-900 tracking-tight"
          >
            Trust built into the Protocol.
          </h2>
        </motion.div>

        {/* Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 relative">
          {/* Connector line (desktop) */}
          <div
            className="hidden sm:block absolute top-8 left-[calc(16.66%+1rem)] right-[calc(16.66%+1rem)] h-px bg-gradient-to-r from-neutral-200 via-brand-green/30 to-neutral-200"
            aria-hidden="true"
          />

          {STEPS.map(({ number, label, icon: Icon, description }, idx) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: idx * 0.15, duration: 0.55, ease: "easeOut" }}
              className="flex flex-col items-center text-center"
            >
              {/* Icon circle */}
              <div className="relative mb-5">
                <div className="w-16 h-16 rounded-2xl bg-white border border-neutral-200 shadow-card flex items-center justify-center">
                  <Icon
                    size={24}
                    className={
                      idx === 2
                        ? "text-brand-green"
                        : "text-neutral-700"
                    }
                    aria-hidden="true"
                  />
                </div>
                {/* Step number badge */}
                <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-neutral-900 text-white text-[10px] font-bold flex items-center justify-center">
                  {number}
                </div>
              </div>

              <p className="text-sm font-semibold text-neutral-900 mb-2">
                {number}. {label}
              </p>
              <p className="text-sm text-neutral-500 max-w-[200px] leading-relaxed">
                {description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Quote */}
        <motion.blockquote
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.55, duration: 0.6 }}
          className="mt-14 text-center"
        >
          <p className="text-sm text-neutral-400 italic">
            &ldquo;Decentralized governance for a unified community.&rdquo;
          </p>
        </motion.blockquote>
      </div>
    </section>
  );
}

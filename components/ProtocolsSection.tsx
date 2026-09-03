"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

// Protocol step data
const PROTOCOL_STEPS = [
  {
    icon: "how_to_vote",
    step: "1",
    title: "Decentralized Voting",
    description:
      "End-to-end encrypted ballots ensuring community elections are transparent and tamper-proof.",
    highlight: false,
  },
  {
    icon: "security_update_good",
    step: "2",
    title: "Smart Settlement",
    description:
      "Results are automatically processed and verified by the system without manual intervention.",
    highlight: false,
  },
  {
    icon: "key_visualizer",
    step: "3",
    title: "Dynamic Auth",
    description:
      "Access keys and permissions are instantly updated across the ecosystem based on verified roles.",
    highlight: true,
  },
] as const;

// --- ProtocolsSection ---
export default function ProtocolsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      ref={ref}
      className="py-32 bg-slate-900 text-white relative overflow-hidden"
      aria-labelledby="protocols-heading"
    >
      {/* Geometric dot pattern overlay */}
      <div className="absolute inset-0 geometric-pattern opacity-10" aria-hidden="true" />

      <div className="max-w-7xl mx-auto px-8 relative z-10">
        {/* Section header */}
        <motion.div
          className="text-center mb-24"
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2
            id="protocols-heading"
            className="font-headline text-4xl md:text-5xl font-extrabold mb-6 tracking-tight"
          >
            Institutional Trust Protocol
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            Every action on the platform is cryptographically verified and
            securely recorded.
          </p>
        </motion.div>

        {/* Steps grid */}
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-16 relative"
          role="list"
          aria-label="Trust protocol steps"
        >
          {PROTOCOL_STEPS.map(({ icon, step, title, description, highlight }, index) => (
            <motion.div
              key={step}
              role="listitem"
              className="text-center group"
              initial={{ opacity: 0, y: 32 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.6,
                ease: [0.16, 1, 0.3, 1],
                delay: 0.1 + index * 0.12,
              }}
            >
              {/* Icon container */}
              <div
                className={`w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8 transition-transform group-hover:scale-110 duration-500 ${
                  highlight
                    ? "bg-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.3)]"
                    : "bg-white/5 border border-white/10"
                }`}
                aria-hidden="true"
              >
                <span
                  className={`material-symbols-outlined text-4xl ${
                    highlight ? "text-white" : "text-emerald-400"
                  }`}
                >
                  {icon}
                </span>
              </div>

              {/* Step title */}
              <h4 className="text-xl font-bold mb-4 font-headline">
                {index + 1}. {title}
              </h4>

              {/* Step description */}
              <p className="text-slate-400 text-sm leading-relaxed px-4">
                {description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

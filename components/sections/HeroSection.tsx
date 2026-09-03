"use client";

import { motion } from "framer-motion";
import { ArrowRight, ChevronRight, TrendingUp } from "lucide-react";

/* ─── Animation variants ─────────────────────────────────────────── */
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] } },
};

/* ─── Donation Widget ────────────────────────────────────────────── */
function DonationWidget() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.7, duration: 0.5, ease: "easeOut" }}
      className="inline-flex items-center gap-3 mt-10 bg-white rounded-2xl px-4 py-3 shadow-[0_4px_24px_-6px_rgba(0,0,0,0.12)] border border-neutral-100"
      aria-label="Today&apos;s Ramadan donation total: $4,820"
    >
      {/* Green icon */}
      <div className="w-9 h-9 rounded-xl bg-brand-green/10 flex items-center justify-center shrink-0">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z"
            fill="#10b981"
            opacity=".9"
          />
        </svg>
      </div>
      {/* Text */}
      <div>
        <p className="text-[10px] text-neutral-400 font-medium uppercase tracking-wider leading-none mb-1">
          Today&apos;s Ramadan
        </p>
        <p className="text-xl font-bold text-neutral-900 leading-none tracking-tight">
          $4,820.00
        </p>
      </div>
      {/* Trend */}
      <div className="ml-2 flex items-center gap-1 bg-brand-green/10 rounded-lg px-2 py-1">
        <TrendingUp size={12} className="text-brand-green" aria-hidden="true" />
        <span className="text-[11px] font-semibold text-brand-green">+12%</span>
      </div>
    </motion.div>
  );
}

/* ─── Hero Section ───────────────────────────────────────────────── */
export default function HeroSection() {
  return (
    <section
      id="hero"
      aria-labelledby="hero-heading"
      className="relative min-h-screen flex flex-col items-center justify-center text-center overflow-hidden pt-24 pb-20"
    >
      {/* Background pattern */}
      <div
        className="absolute inset-0 hero-grid-bg pointer-events-none"
        aria-hidden="true"
      />

      {/* Radial gradient overlay */}
      <div
        className="absolute inset-0 bg-gradient-radial from-transparent via-white/60 to-white pointer-events-none"
        aria-hidden="true"
      />

      {/* Subtle green glow at top-center */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-brand-green/6 blur-[100px] rounded-full pointer-events-none"
        aria-hidden="true"
      />

      {/* Content */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6"
      >
        {/* Badge */}
        <motion.div variants={item} className="flex justify-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-green/10 border border-brand-green/20 text-brand-green text-xs font-semibold tracking-wide">
            <span
              className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse"
              aria-hidden="true"
            />
            NOW IN PRIVATE ALPHA
          </span>
        </motion.div>

        {/* Heading */}
        <motion.h1
          id="hero-heading"
          variants={item}
          className="mt-6 text-[clamp(2.4rem,6vw,4rem)] font-bold text-neutral-900 leading-[1.1] tracking-tight text-balance"
        >
          The Operating System
          <br />
          for the Ummah.
        </motion.h1>

        {/* Subheading */}
        <motion.p
          variants={item}
          className="mt-5 text-base sm:text-lg text-neutral-500 max-w-lg mx-auto leading-relaxed text-pretty"
        >
          From granular permissions and secure elections to Stripe-powered
          donations and a no-code website builder. Everything your masjid
          needs to thrive in the digital age.
        </motion.p>

        {/* CTAs */}
        <motion.div
          variants={item}
          className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <a
            href="#register"
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-neutral-900 rounded-xl hover:bg-neutral-800 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
          >
            Register Your Masjid
            <ArrowRight size={15} aria-hidden="true" />
          </a>
          <a
            href="#directory"
            className="inline-flex items-center gap-1.5 px-6 py-3 text-sm font-semibold text-neutral-700 bg-white rounded-xl border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2"
          >
            Explore the Directory
            <ChevronRight size={14} className="text-neutral-400" aria-hidden="true" />
          </a>
        </motion.div>

        {/* Donation widget */}
        <DonationWidget />
      </motion.div>
    </section>
  );
}

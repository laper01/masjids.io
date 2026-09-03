"use client";

import { motion } from "framer-motion";

// Animation variants for staggered children
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
};

const mockupVariants = {
  hidden: { opacity: 0, x: 40, scale: 0.96 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.4 },
  },
};

// --- HeroSection Component ---
export default function HeroSection() {
  return (
    <section
      className="relative min-h-[90vh] flex items-center pt-20 pb-20 overflow-hidden bg-slate-900"
      aria-label="Hero — The Institutional OS for the Ummah"
    >
      {/* Background immersive image with overlay */}
      <div className="absolute inset-0 z-0" aria-hidden="true">
        <img
          alt=""
          className="w-full h-full object-cover opacity-40 mix-blend-overlay"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBtV3Ut3hrapn-dbMLGs0A3Tb5OwU2_vIKl09DI8hQmAKcu14DTy_vhjlaBXvTyZ_TX0s6TbPtYrREav7mOYEytweZKExpboneyzS5-r-MkbdBO9oaWKHtx1gkR2wd7lyjul4GS8B6LyrPvyaM4UDbclA7kdMve-ZJvGCCy2vbb1upPvtCFnd0xFTbh8AxEKcJG5tUTUz4Eck9VpQYaWb7NqRO8kfjSPoM95i8jv_roT0CVGyWX-8oyaN__iNVRpaw1FQqXtVPauCw"
        />
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-900/40 to-slate-950/90" />
        {/* Geometric dot pattern */}
        <div className="absolute inset-0 geometric-pattern opacity-[0.03]" />
      </div>

      <div className="max-w-7xl mx-auto px-8 relative z-10 w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* Left — Headline + CTAs */}
          <motion.div
            className="flex flex-col items-start text-left max-w-3xl"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Badge */}
            <motion.span
              variants={itemVariants}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-8 border border-emerald-500/20 backdrop-blur-md"
            >
              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">verified</span>
              Institutional Grade Infrastructure
            </motion.span>

            {/* Headline */}
            <motion.h1
              variants={itemVariants}
              className="font-headline text-5xl md:text-7xl font-extrabold tracking-tightest text-white leading-[1.05] mb-8"
            >
              The Operating System{" "}
              <br className="hidden md:block" />
              for the{" "}
              <span className="text-emerald-400">Ummah.</span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              variants={itemVariants}
              className="text-lg md:text-xl text-slate-300 leading-relaxed mb-12 max-w-xl font-medium"
            >
              A unified platform for governance, finance, and community
              engagement. Built for the sacred mission of the modern masjid.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row gap-5 w-full sm:w-auto"
            >
              <button
                className="bg-primary text-white px-10 py-5 rounded-xl font-bold text-lg hover-lift premium-shadow flex items-center justify-center gap-2 shadow-emerald-900/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                aria-label="Register your masjid"
              >
                Register Your Masjid
                <span className="material-symbols-outlined" aria-hidden="true">arrow_right_alt</span>
              </button>
              <button
                className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-10 py-5 rounded-xl font-bold text-lg hover:bg-white/20 transition-all flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                aria-label="Explore the masjid directory"
              >
                Explore Directory
              </button>
            </motion.div>

            {/* Trust Bar */}
            <motion.div
              variants={itemVariants}
              className="mt-16 flex items-center gap-8 border-t border-white/10 pt-8 w-full"
              aria-label="Platform statistics"
            >
              <div className="flex flex-col">
                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2">
                  Powering
                </span>
                <span className="text-white font-headline font-bold text-xl">
                  12,400+{" "}
                  <span className="text-slate-400 font-medium text-sm">Centers</span>
                </span>
              </div>
              <div className="w-px h-10 bg-white/10" aria-hidden="true" />
              <div className="flex flex-col">
                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2">
                  Impact
                </span>
                <span className="text-white font-headline font-bold text-xl">
                  $842M+{" "}
                  <span className="text-slate-400 font-medium text-sm">Collected</span>
                </span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right — Dashboard Mockup */}
          <motion.div
            className="relative hidden lg:block"
            variants={mockupVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="relative z-20 glass-card p-2 rounded-[2.5rem] shadow-2xl border-white/10">
              <div className="bg-white rounded-[2rem] overflow-hidden">
                {/* Window chrome */}


                {/* Dashboard content */}

              </div>
            </div>

            {/* Glow decorations */}
            <div
              className="absolute -top-10 -right-10 w-40 h-40 bg-primary/20 rounded-full blur-[80px]"
              aria-hidden="true"
            />
            <div
              className="absolute -bottom-10 -left-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px]"
              aria-hidden="true"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

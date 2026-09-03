"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { useSession } from "next-auth/react";

const SOLUTIONS = [
  {
    href: "https://events.masjids.io",
    icon: "event",
    label: "eventmasjid.io",
    desc: "Mosque event management & scheduling",
  },
  {
    href: "https://nikkah.masjids.io",
    icon: "favorite",
    label: "nikkah.io",
    desc: "Muslim matchmaking & marriage platform",
  },
  {
    href: "https://adhan.masjids.io",
    icon: "notifications_active",
    label: "adhan.io",
    desc: "Prayer times, adhan & qibla direction",
  },
];

export default function Navbar() {
  const [solutionsOpen, setSolutionsOpen] = useState(false);
  const { data: session, status } = useSession();

  const isLoggedIn  = status === "authenticated";
  const isLoading   = status === "loading";

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-0 w-full z-50 nav-blur border-b border-emerald-900/5 px-8 py-4"
      aria-label="Main navigation"
    >
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link
          href="/"
          className="text-2xl font-extrabold tracking-tightest text-emerald-950 flex items-center gap-2 font-headline"
          aria-label="masjids.io — home"
        >
          <span
            className="material-symbols-outlined text-primary text-3xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
            aria-hidden="true"
          >
            mosque
          </span>
          masjids.io
        </Link>

        <div
          className="hidden md:flex items-center gap-10 font-headline font-semibold text-sm tracking-tight"
          role="navigation"
        >
          <Link href="#" className="text-primary" aria-current="page">
            Platform
          </Link>

          <div
            className="relative"
            onMouseEnter={() => setSolutionsOpen(true)}
            onMouseLeave={() => setSolutionsOpen(false)}
          >
            <button
              className="flex items-center gap-1 text-slate-500 hover:text-primary transition-colors focus-visible:outline-none"
              aria-haspopup="true"
              aria-expanded={solutionsOpen}
            >
              Solutions
              <motion.span
                className="material-symbols-outlined text-base leading-none"
                animate={{ rotate: solutionsOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                aria-hidden="true"
              >
                keyboard_arrow_down
              </motion.span>
            </button>

            <AnimatePresence>
              {solutionsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.97 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-72 bg-white rounded-2xl shadow-xl border border-emerald-900/8 p-2 origin-top"
                  role="menu"
                >
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-l border-t border-emerald-900/8 rotate-45" />
                  {SOLUTIONS.map(({ href, icon, label, desc }) => (
                    <Link
                      key={href}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      role="menuitem"
                      className="flex items-start gap-3 px-4 py-3 rounded-xl hover:bg-emerald-50 transition-colors group"
                    >
                      <span
                        className="material-symbols-outlined text-xl text-primary mt-0.5 shrink-0"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                        aria-hidden="true"
                      >
                        {icon}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-emerald-950 group-hover:text-primary transition-colors">
                          {label}
                        </p>
                        <p className="text-xs text-slate-400 font-normal mt-0.5 leading-snug">
                          {desc}
                        </p>
                      </div>
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Link
            href="/public-masjids"
            className="text-slate-500 hover:text-primary transition-colors"
          >
            Masjids
          </Link>
          <Link
            href="#"
            className="text-slate-500 hover:text-primary transition-colors"
          >
            Pricing
          </Link>
        </div>

        {/* ── Auth Buttons ── */}
        <div className="flex items-center gap-4">
          {isLoading ? (
            // Skeleton while session loads — prevents layout shift
            <div className="h-9 w-32 rounded-lg bg-slate-100 animate-pulse" />
          ) : isLoggedIn ? (
            // Logged in — single CTA to dashboard
            <Link
              href="/dashboard"
              className="bg-inherit text-emerald-900 px-52  rounded-lg text-sm font-bold hover:transition-all premium-shadow inner-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 flex items-center gap-2"
              aria-label="Go to your dashboard"
            >
              <span
                className="material-symbols-outlined text-base leading-none"
                style={{ fontVariationSettings: "'FILL' 1" }}
                aria-hidden="true"
              >
                dashboard
              </span>
              Dashboard
            </Link>
          ) : (
            // Not logged in — Sign In + Get Started
            <>
              <Link
                href="/login"
                className="text-slate-600 hover:text-primary text-sm font-semibold transition-colors px-4 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-lg"
                aria-label="Sign in to your account"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="bg-primary text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-emerald-900 transition-all premium-shadow inner-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
                aria-label="Get started with masjids.io"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </motion.nav>
  );
}